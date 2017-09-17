import { BoardSize } from "./BoardSize";
import { Coords } from "./Coords";
import { Player } from "./Player";
import { Tile } from "./Tile";
import { TileSet } from "./TileSet";
import { Utils } from "./Utils";

export class Map {
  public boardSize: BoardSize;

  protected tileSet: TileSet;
  protected renderAngle: number = 0;

  protected board = [];

  constructor(tileSet: TileSet, boardSize: BoardSize, board = []) {
    this.tileSet = tileSet;
    this.boardSize = boardSize;
    this.board = this.fixBoard(board);
  }

  // return array with all tiles in (with x and y added)
  public getAllTiles() {
    const allTiles = this.board.map((column, mapX) => {
      return column.map((item: Tile, mapY) => {
        return item.modify({
          x: mapX,
          y: mapY
        });
      });
    });
    const reducedTiles = allTiles.reduce((total, item) => {
      return total.concat(item);
    }, []);

    return reducedTiles;
  }

  public shrinkBoard() {
    this.boardSize.shrink();
    this.board = this.correctBoardSizeChange(this.board, this.boardSize);
    return this.boardSize;
  }

  public growBoard() {
    this.boardSize.grow();
    this.board = this.correctBoardSizeChange(this.board, this.boardSize);
    return this.boardSize;
  }

  public correctBoardSizeChange(board, boardSize: BoardSize) {
    const newBoard = [];

    const currentWidth: number = board.length;
    let currentHeight: number;
    if (currentWidth > 0) {
      currentHeight = board[0].length;
    } else {
      currentHeight = 0;
    }

    for (let x = 0; x < boardSize.width; x++) {
      newBoard[x] = [];
      for (let y = 0; y < boardSize.height; y++) {
        if (x < currentWidth && y < currentHeight) {
          // using current board
          const tile = board[x][y];
          newBoard[x][y] = tile;
        } else {
          // adding blank tiles
          const tile = this.cloneTile(1);
          newBoard[x][y] = tile;
        }
      }
    }
    return newBoard;
  }

  public getBoard() {
    return this.board;
  }

  // this needs to turn data into Tile objects too
  public updateBoard(board: Tile[][], boardSize: BoardSize) {
    this.board = this.fixBoard(board);
    this.boardSize = boardSize;
  }

  public updateBoardWithRandom(boardSize: BoardSize) {
    this.boardSize = boardSize;
    this.board = this.generateRandomBoard(boardSize);
  }

  public correctForOverflow(coords: Coords): Coords {
    return Utils.correctForOverflow(coords, this.boardSize);
  }

  // is intended next tile empty / a wall?
  public checkTileIsEmpty(x, y) {
    const tile = this.getTile(x, y);
    return tile.background;
  }

  public getTileWithCoords(coords: Coords) {
    const fixedCoords = this.correctForOverflow(coords);
    const { x, y } = fixedCoords;
    return this.board[x][y];
  }

  public changeTile(coords: Coords, tile: Tile) {
    this.board[coords.x][coords.y] = tile;
  }

  public rotatePlayer(player: Player, clockwise) {
    const newCoords = this.translateRotation(player.coords, clockwise);

    let direction = player.direction;
    // if player is still, nudge them in rotation direction
    if (direction === 0) {
      if (clockwise) {
        direction = 1;
      } else {
        direction = -1;
      }
    }

    return player.modify({
      coords: newCoords.modify({
        offsetX: 0,
        offsetY: 0
      }),
      direction
    });
  }

  public cloneTile(id): Tile {
    const prototypeTile = this.getPrototypeTile(id);
    return new Tile(prototypeTile); // create new Tile object with these
  }

  public getRandomTile(tiles) {
    const randomProperty = obj => {
      const randomKey = Utils.getRandomObjectKey(obj);
      return this.cloneTile(randomKey);
    };

    const theseTiles = this.tileSet.getTiles();
    (Object as any).entries(theseTiles).filter(([key, tile]) => {
      if (tile.dontAdd) {
        delete theseTiles[key];
      }
      return true;
    });
    return randomProperty(theseTiles);
  }

  // swap two tiles on map
  public switchTiles(id1, id2) {
    const tiles = this.getAllTiles();
    const changeCoords = tiles.map(tile => {
      if (tile.id === id1) {
        const coords = new Coords({ x: tile.x, y: tile.y });
        this.changeTile(coords, this.cloneTile(id2));
        return coords;
      } else if (tile.id === id2) {
        const coords = new Coords({ x: tile.x, y: tile.y });
        this.changeTile(coords, this.cloneTile(id1));
        return coords;
      }
      return;
    });
    return changeCoords;
  }

  // find random tile of type that is NOT at currentCoords
  public findTile(currentCoords: Coords, id) {
    const tiles = this.getAllTiles();
    const teleporters = tiles.filter(tile => {
      if (tile.x === currentCoords.x && tile.y === currentCoords.y) {
        return false;
      }
      return tile.id === id;
    });
    if (teleporters.length === 0) {
      return false; // no options
    }
    const newTile = teleporters[Math.floor(Math.random() * teleporters.length)];
    return newTile;
  }

  public rotateBoard(clockwise) {
    const newBoard = this.getBlankBoard();

    const width = this.boardSize.width - 1;
    const height = this.boardSize.height - 1;

    const tiles = this.getAllTiles();

    tiles.map(tile => {
      const coords = new Coords({ x: tile.x, y: tile.y });
      const newCoords = this.translateRotation(coords, clockwise);
      const newTile = tile.modify({
        x: newCoords.x,
        y: newCoords.y
      });
      newBoard[newCoords.x][newCoords.y] = newTile;
    });

    if (clockwise) {
      this.renderAngle = this.renderAngle + 90;
      if (this.renderAngle > 360) {
        this.renderAngle = this.renderAngle - 360;
      }
    } else {
      this.renderAngle = this.renderAngle - 90;
      if (this.renderAngle < 0) {
        this.renderAngle = 360 + this.renderAngle;
      }
    }

    this.board = newBoard;

    return true;
  }

  public fixBoard(board: Tile[][]) {
    const newBoard = board.map((column, mapY) => {
      return column.map((item, mapX) => {
        const newTile = this.cloneTile(item.id);
        return newTile.modify({
          x: mapX,
          y: mapY
        });
      });
    });
    return newBoard;
  }
  protected getTile(x: number, y: number) {
    const coords = new Coords({ x, y });
    return this.getTileWithCoords(coords);
  }

  protected generateBlankBoard() {
    const board = [];

    for (let x = 0; x < this.boardSize.width; x++) {
      board[x] = [];
      for (let y = 0; y < this.boardSize.height; y++) {
        const blankTile = this.cloneTile(1);
        board[x][y] = blankTile;
      }
    }
    return board;
  }

  protected generateRandomBoard(boardSize: BoardSize) {
    const board = [];

    for (let x = 0; x < boardSize.width; x++) {
      board[x] = [];
      for (let y = 0; y < boardSize.height; y++) {
        const blankTile = this.getRandomTile(this.tileSet.getTiles());
        board[x][y] = blankTile;
      }
    }
    return board;
  }

  protected getPrototypeTile(id) {
    return this.tileSet.getTile(id);
  }

  protected translateRotation(coords: Coords, clockwise: boolean): Coords {
    const width = this.boardSize.width - 1;
    const height = this.boardSize.height - 1;

    if (clockwise) {
      // 0,0 -> 9,0
      // 9,0 -> 9,9
      // 9,9 -> 0,9
      // 0,9 -> 0,0
      return coords.modify({
        x: width - coords.y,
        y: coords.x
      });
    } else {
      // 0,0 -> 0,9
      // 0,9 -> 9,9
      // 9,9 -> 9,0
      // 9,0 -> 0,0
      return coords.modify({
        x: coords.y,
        y: height - coords.x
      });
    }
  }

  // get empty grid without tiles in
  protected getBlankBoard() {
    const newBoard = [];
    for (let x = 0; x < this.boardSize.width; x++) {
      newBoard[x] = [];
      for (let y = 0; y < this.boardSize.height; y++) {
        newBoard[x][y] = [];
      }
    }
    return newBoard;
  }
}
