import * as _ from "ramda";
import { Board } from "./Board";
import { BoardSize } from "./BoardSize";
import { Coords } from "./Coords";
import { GameState } from "./GameState";
import { Jetpack } from "./Jetpack";
import { Map } from "./Map";
import { Player } from "./Player";
import { Renderer } from "./Renderer";

import { is } from "immutable";

const OFFSET_DIVIDE: number = 100;

// movement takes the current map, the current players, and returns new player objects
// it is then trashed and a new one made for next move to reduce any real held state
export class Movement {
  protected map: Map;

  constructor(map: Map) {
    this.map = map; // object that has been loaded with tiles for us to use - does not hold data
  }

  // loop through passed players[] array, do changes, return new one
  public doCalcs(gameState: GameState, timePassed: number): GameState {
    const newPlayers = gameState.players.map(player => {
      return this.doPlayerCalcs(player, gameState.board, timePassed);
    });
    const newGameState = gameState.modify({
      players: newPlayers
    });

    return newGameState;
  }

  public correctTileOverflow(coords: Coords): Coords {
    if (coords.offsetX >= OFFSET_DIVIDE) {
      // move one tile to right
      return coords.modify({
        offsetX: 0,
        x: coords.x + 1
      });
    }

    if (coords.offsetX <= -1 * OFFSET_DIVIDE) {
      // move one tile to left
      return coords.modify({
        offsetX: 0,
        x: coords.x - 1
      });
    }

    if (coords.offsetY >= OFFSET_DIVIDE) {
      // move one tile down
      return coords.modify({
        offsetY: 0,
        y: coords.y + 1
      });
    }

    if (coords.offsetY <= -1 * OFFSET_DIVIDE) {
      // move one tile up
      return coords.modify({
        offsetY: 0,
        y: coords.y - 1
      });
    }

    return coords;
  }

  // only public so it can be tested, please don't use outside of here
  public checkFloorBelowPlayer(
    board: Board,
    timePassed: number,
    player: Player
  ): Player {
    if (player.coords.offsetX !== 0) {
      return player;
    }

    const coords = player.coords;

    const map = new Map([], new BoardSize(board.getLength()));

    const belowCoords = map.correctForOverflow(
      coords.modify({ y: coords.y + 1 })
    );

    const tile = board.getTile(belowCoords.x, belowCoords.y);

    if (tile.background) {
      // gap below, start falling down it
      return player.modify({
        falling: true
      });
    }

    if (tile.get("breakable") === true && player.falling) {
      return player; // allow player to keep falling through breakable tile
    }

    // solid ground, stop falling
    return player.modify({
      falling: false
    });
  }

  public static calcMoveAmount(moveSpeed: number, timePassed: number): number {
    const moveAmount: number = 1 / OFFSET_DIVIDE * moveSpeed * 5;
    const frameRateAdjusted: number = moveAmount * timePassed;
    if (isNaN(frameRateAdjusted)) {
      return 0;
    }
    return frameRateAdjusted;
  }

  // curry and compose together a nice pipeline function to transform old player state into new
  protected getCalcFunction(oldPlayer: Player, board: Board, timePassed: number) {
    const checkFloorBelowPlayer = _.curry(this.checkFloorBelowPlayer);
    const checkPlayerDirection = _.curry(this.checkPlayerDirection);
    const incrementPlayerDirection = _.curry(this.incrementPlayerDirection);
    const checkForMovementTiles = _.curry(this.checkForMovementTiles);
    const markPlayerAsMoved = _.curry(this.markPlayerAsMoved);

    return _.compose(
      markPlayerAsMoved(oldPlayer),
      checkForMovementTiles(board),
      this.correctPlayerOverflow,
      incrementPlayerDirection(board),
      checkPlayerDirection(board),
      checkFloorBelowPlayer(board, timePassed),
      this.incrementPlayerFrame
     );
  }

  protected doPlayerCalcs(
    player: Player,
    board: Board,
    timePassed: number
  ): Player {

    // this is great but curried functions lose context, so need to get rid of 'this'
    // inside them (which is fine really - need to classes like Map into stateless modules anyhow)
    /*const playerCalcFn = this.getCalcFunction(player, board, timePassed);

    return playerCalcFn(player);*/
    
    const newPlayer = this.incrementPlayerFrame(player);

    const newerPlayer = this.checkFloorBelowPlayer(
      board,
      timePassed,
      newPlayer
    );

    const checkedPlayer = this.checkPlayerDirection(board,newerPlayer);

    const evenNewerPlayer = this.incrementPlayerDirection(
      timePassed,
      checkedPlayer
    );

    const newestPlayer = this.correctPlayerOverflow(evenNewerPlayer);

    // do our checks for current tile once the overflow has put us into a nice new space (if appropriate)

    const maybeTeleportedPlayer = this.checkForMovementTiles(
      board,
      newestPlayer
    );

    const markedAsMovedPlayer = this.markPlayerAsMoved(player, maybeTeleportedPlayer);

    return markedAsMovedPlayer;
  }

  // work out whether player's location has moved since last go
  protected markPlayerAsMoved(oldPlayer: Player, newPlayer: Player) : Player {
    if (this.playerHasMoved(oldPlayer, newPlayer)) {
      return newPlayer.modify({
        moved: true
      });
    }
    return newPlayer.modify({
      moved: false
    })
  }

  // works out whether Player has actually moved since last go
  // used to decide whether to do an action to stop static players hitting switches infinitely etc
  protected playerHasMoved(oldPlayer: Player, newPlayer: Player) : boolean {
    return (!is(oldPlayer.coords, newPlayer.coords));
  }

  protected checkForMovementTiles(board: Board, player: Player): Player {
    const currentCoords = player.coords;

    if (currentCoords.offsetX !== 0 || currentCoords.offsetY !== 0) {
      return player;
    }

    const coords = this.map.correctForOverflow(currentCoords);

    const tile = board.getTile(coords.x, coords.y);

    if (tile.action === "teleport") {
      return this.teleport(player, board);
    }

    return player;
  }

  // find another teleport and go to it
  // if no others, do nothing
  protected teleport(player: Player, board: Board): Player {
    if (player.lastAction === "teleport") {
      return player;
    }
    const newTile = this.map.findTile(board, player.coords, 14);
    if (newTile) {
      // console.log('newTile',newTile.x,newTile.y);
      return player.modify({
        coords: player.coords.modify({
          x: newTile.x,
          y: newTile.y
        }),
        lastAction: "teleport"
      });
    }
    return player;
  }

  protected incrementPlayerFrame(player: Player): Player {
    if (
      player.direction === 0 &&
      player.oldDirection === 0 &&
      player.currentFrame === 0
    ) {
      // we are still, as it should be
      return player;
    }

    if (player.direction === 0 && player.currentFrame === 0) {
      // if we're still, and have returned to main frame, disregard old movement
      return player.modify({
        oldDirection: 0
      });
    }

    let newFrame = player.currentFrame;

    // if going left, reduce frame
    if (player.direction < 0 || player.oldDirection < 0) {
      newFrame = player.currentFrame - 1;
      if (newFrame < 0) {
        newFrame = player.frames - 1;
      }
    }

    // if going right, increase frame
    if (player.direction > 0 || player.oldDirection > 0) {
      newFrame = player.currentFrame + 1;
      if (newFrame >= player.frames) {
        newFrame = 0;
      }
    }

    return player.modify({
      currentFrame: newFrame
    });
  }

  // this checks whether the next place we intend to go is a goddamn trap, and changes direction if so
  protected checkPlayerDirection(board: Board, player: Player): Player {
    const coords = player.coords;

    if (player.direction !== 0 && player.falling === false) {
      if (
        !this.map.checkTileIsEmpty(board, coords.x - 1, coords.y) &&
        !this.map.checkTileIsEmpty(board, coords.x + 1, coords.y)
      ) {
        return player.modify({
          stop: true // don't go on this turn
        });
      }
    }

    if (player.direction < 0 && player.falling === false) {
      if (!this.map.checkTileIsEmpty(board, coords.x - 1, coords.y)) {
        // turn around
        return player.modify({
          coords: coords.modify({
            offsetX: 0
          }),
          direction: 1,
          stop: false
        });
      }
    }

    if (player.direction > 0 && player.falling === false) {
      if (!this.map.checkTileIsEmpty(board, coords.x + 1, coords.y)) {
        // turn around
        return player.modify({
          coords: coords.modify({
            offsetX: 0
          }),
          direction: -1,
          stop: false
        });
      }
    }

    return player.modify({
      stop: false
    });
  }

  // this does the left/right moving, but does not care if walls are there as that is the responsibility of checkPlayerDirection
  protected incrementPlayerDirection(
    timePassed: number,
    player: Player
  ): Player {
    // falling is priority - do this if a thing
    if (player.falling) {
      const fallAmount: number = Movement.calcMoveAmount(
        player.fallSpeed,
        timePassed
      );
      const newOffsetY = player.coords.offsetX + fallAmount;
      const newCoords = player.coords.modify({
        offsetY: player.coords.offsetY + fallAmount
      });
      return player.modify({
        coords: newCoords
      });
    }

    if (player.moveSpeed === 0 || player.stop !== false) {
      // we are still, no need for movement
      return player;
    }

    const moveAmount = Movement.calcMoveAmount(player.moveSpeed, timePassed);

    const coords = player.coords;

    if (player.direction < 0) {
      // move left
      const newOffsetX = coords.offsetX - moveAmount;
      return player.modify({
        coords: coords.modify({
          offsetX: newOffsetX
        })
      });
    } else if (player.direction > 0) {
      // move right
      const newOffsetX = coords.offsetX + moveAmount;

      return player.modify({
        coords: coords.modify({
          offsetX: newOffsetX
        })
      });
    }

    // if we've stopped and ended up not quite squared up, correct this
    if (player.direction === 0) {
      if (coords.offsetX > 0) {
        // shuffle left
        const newOffsetX = coords.offsetX - moveAmount;

        return player.modify({
          coords: coords.modify({
            offsetX: newOffsetX
          })
        });
      } else if (coords.offsetX < 0) {
        // shuffle right
        const newOffsetX = coords.offsetX + moveAmount;

        return player.modify({
          coords: coords.modify({
            offsetX: newOffsetX
          })
        });
      }
    }

    // do nothing, return same object
    return player;
  }

  

  protected correctPlayerOverflow(player: Player): Player {
    const newCoords = this.correctTileOverflow(player.coords);
    const loopedCoords = this.map.correctForOverflow(newCoords);

    if (
      loopedCoords.x !== player.coords.x ||
      loopedCoords.y !== player.coords.y
    ) {
      // if we've actually moved, then
      return player.modify({
        coords: loopedCoords,
        lastAction: ""
      });
    }

    // else
    return player.modify({
      coords: loopedCoords
    });
  }
}
