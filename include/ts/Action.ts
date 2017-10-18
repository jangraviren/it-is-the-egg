import { Board } from "./Board";
import { GameState } from "./GameState";
import { Map } from "./Map";
import { Player } from "./Player";

// this concerns all the changes between player and board

export class Action {
  protected map: Map;

  constructor(map: Map) {
    this.map = map;
  }

  // go through each player, check it's effect on board, score and outcome, return new gameState obj
  public checkAllPlayerTileActions(gameState: GameState): GameState {
    return gameState.players.reduce(
      (currentGameState: GameState, player: Player) => {
        const updated = this.checkPlayerTileAction(
          player,
          currentGameState.board,
          currentGameState.score,
          currentGameState.outcome
        );

        const postCrateBoard = this.checkTileBelowPlayer(player, updated.board);

        return gameState.modify({
          board: postCrateBoard,
          outcome: updated.outcome,
          score: updated.score
        });
      },
      gameState
    );
  }

  protected checkPlayerTileAction(
    player: Player,
    board: Board,
    score: number,
    outcome: string
  ): { outcome: string; board: Board; score: number } {
    const currentCoords = player.coords;

    if (currentCoords.offsetX !== 0 || currentCoords.offsetY !== 0 || player.moved === false) {
      return {
        board,
        outcome,
        score
      };
    }

    const coords = this.map.correctForOverflow(currentCoords);

    const tile = board.getTile(coords.x, coords.y);

    if (tile.collectable > 0) {
      const newScore = tile.collectable * player.multiplier;
      const blankTile = this.map.cloneTile(1);
      const newTile = blankTile.modify({
        x: coords.x,
        y: coords.y
      });

      return {
        board: board.modify(coords.x, coords.y, newTile),
        outcome,
        score: score + newScore
      };
    }

    if (tile.action === "completeLevel") {
      return {
        board,
        outcome: "completeLevel",
        score
      };
    } else if (tile.action === "pink-switch") {
      return {
        board: this.map.switchTiles(board, 15, 16),
        outcome,
        score
      };
    } else if (tile.action === "green-switch") {
      return {
        board: this.map.switchTiles(board, 18, 19),
        outcome,
        score
      };
    }
    return {
      board,
      outcome,
      score
    };
  }

  // basically, do we need to smash the block below?
  protected checkTileBelowPlayer(player: Player, board: Board): Board {
    if (player.falling === false) {
      return board;
    }

    const coords = player.coords;

    const belowCoords = this.map.correctForOverflow(
      coords.modify({ y: coords.y + 1 })
    );

    const tile = board.getTile(belowCoords.x, belowCoords.y);

    if (tile.get("breakable") === true) {
      // if tile below is breakable (and we are already falling and thus have momentum, smash it)
      const newTile = this.map.cloneTile(1);
      const newTileWithCoords = newTile.modify({
        x: belowCoords.x,
        y: belowCoords.y
      });
      return board.modify(belowCoords.x, belowCoords.y, newTileWithCoords);
    }
    return board;
  }
}