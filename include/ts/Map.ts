import { BoardSize } from "./BoardSize";
import { Coords } from "./Coords";
import { Player } from "./Player";
import { Tile } from "./Tile";
import { TileSet } from "./TileSet";
import { Utils } from "./Utils";

export class Map {

	tileSet: TileSet;
	renderAngle: number = 0;

	boardSize: BoardSize;

	protected board = [];

	constructor(tileSet: TileSet, boardSize: BoardSize, board = []) {
		this.tileSet = tileSet;
		this.boardSize = boardSize;
		this.board = board;
		this.markAllForRedraw();
	}

	updateBoard(board, boardSize: BoardSize) {
		this.board = board;
		this.boardSize = boardSize;
	}

	updateBoardWithRandom(boardSize: BoardSize) {
		this.boardSize = boardSize;
		this.board = this.generateRandomBoard(boardSize);
	}

	correctForOverflow(x: number, y: number, offsetX: number = 0, offsetY: number = 0): Coords {
		let newX, newY;
		if (x < 0) {
			newX = this.boardSize.width - 1;
		} else if (x >= this.boardSize.width) {
			newX = 0;
		} else {
			newX = x;
		}

		if (y < 0) {
			newY = this.boardSize.height - 1;
		} else if (y >= this.boardSize.height) {
			newY = 0;
		} else {
			newY = y;
		}
		return new Coords(newX, newY, offsetX, offsetY);
	}

	// is intended next tile empty / a wall?
	checkTileIsEmpty(x, y) {
		const tile = this.getTile(x, y);
		return tile.background;
	}

	markAllForRedraw() {
		const tiles = this.getAllTiles();
		tiles.map((tile) => {
			tile.needsDraw = true;
		});
		return;
	}

	generateBlankBoard() {
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

	generateRandomBoard(boardSize: BoardSize) {
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

	getTilesSurrounding(coords: Coords) {
		const tiles = [];
		// first just do the stuff around player
		for (let x = coords.x - 1; x < coords.x + 2; x++) {
			for (let y = coords.y - 1; y < coords.y + 2; y++) {
				const fixedCoords = this.correctForOverflow(x, y);
				const tile = this.getTileWithCoords(fixedCoords);
				tiles.push(tile);
			}
		}
		return tiles;
	}

	getTile(x: number, y: number) {
		const coords = new Coords(x, y);
		return this.getTileWithCoords(coords);
	}

	getTileWithCoords(coords: Coords) {
		const fixedCoords = this.correctForOverflow(coords.x, coords.y);
		const { x, y } = fixedCoords;
		const tile = this.board[x][y];
		tile.x = x;
		tile.y = y;
		return tile;
	}

	changeTile(coords: Coords, tile: Tile) {
		const { x, y } = coords;
		this.board[x][y] = tile;
	}

	getPrototypeTile(id) {
		return this.tileSet.getTile(id);
	}

	cloneTile(id): Tile {
		const prototypeTile = this.getPrototypeTile(id);
		const tile = new Tile(prototypeTile); // create new Tile object with these
		return tile;
	}

	getRandomTile(tiles) {
		const randomProperty = (obj) => {
		    const randomKey = Utils.getRandomObjectKey(obj);
		    return this.cloneTile(randomKey);
		};

		const theseTiles = this.tileSet.getTiles();
		(Object as any).entries(theseTiles).filter(([key, tile]) => {
			if (tile.dontAdd) delete theseTiles[key];
			return true;
		});
		return randomProperty(theseTiles);
	}

	// get empty grid without tiles in
	getBlankBoard() {
		const newBoard = [];
		for (let x = 0; x < this.boardSize.width; x++) {
			newBoard[x] = [];
			for (let y = 0; y < this.boardSize.height; y++) {
				newBoard[x][y] = [];
			}
		}
		return newBoard;
	}

	// swap two tiles on map
	switchTiles(id1, id2) {
		const tiles = this.getAllTiles();
		const count = tiles.map((tile) => {
			if (tile.id === id1) {
				const coords = new Coords(tile.x, tile.y);
				this.changeTile(coords, this.cloneTile(id2));
				return 1;
			} else if (tile.id === id2) {
				const coords = new Coords(tile.x, tile.y);
				this.changeTile(coords, this.cloneTile(id1));
				return 1;
			}
			return 0;
		});
		return count.reduce((a, b) => a + b, 0);
	}

	// find random tile of type that is NOT at currentCoords
	findTile(currentCoords: Coords, id) {
		const tiles = this.getAllTiles();
		const teleporters = tiles.filter((tile) => {
			if (tile.x == currentCoords.x && tile.y == currentCoords.y) return false;
			return (tile.id == id);
		});
		if (teleporters.length == 0) return false; // no options
		const newTile = teleporters[Math.floor(Math.random() * teleporters.length)];
		return newTile;
	}

	translateRotation(coords: Coords, clockwise: boolean): Coords {

		const width = this.boardSize.width - 1;
		const height = this.boardSize.height - 1;

		if (clockwise) {
			// 0,0 -> 9,0
			// 9,0 -> 9,9
			// 9,9 -> 0,9
			// 0,9 -> 0,0
			return coords.modify({
				x: width - coords.y,
				y: coords.x,
			});
		} else {
			// 0,0 -> 0,9
 			// 0,9 -> 9,9
 			// 9,9 -> 9,0
 			// 9,0 -> 0,0
			return coords.modify({
				x: coords.y,
				y: height - coords.x,
			});
		}
	}

	rotateBoard(clockwise) {
		const newBoard = this.getBlankBoard();

		const width = this.boardSize.width - 1;
		const height = this.boardSize.height - 1;

		const tiles = this.getAllTiles();

		tiles.map((tile) => {
			const coords = new Coords(tile.x, tile.y);
			const newCoords = this.translateRotation(coords, clockwise);
			tile.x = newCoords.x;
			tile.y = newCoords.y;
			tile.needsDraw = true;
			newBoard[newCoords.x][newCoords.y] = tile;
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

	rotatePlayer(player: Player, clockwise) {

		const newCoords = this.translateRotation(player.coords, clockwise);

		let direction = player.direction;
		// if player is still, nudge them in rotation direction
		if (direction == 0) {
			if (clockwise) {
				direction = 1;
			} else {
				direction = -1;
			}
		}

		return player.modify({
			coords: newCoords.modify({
				offsetX: 0,
				offsetY: 0,
			}),
			direction,
		});
	}

	// return array with all tiles in (with x and y added)
	getAllTiles() {
		const allTiles = [];
		for (const x in this.board) {
			for (const y in this.board[x]) {
				const id = this.board[x][y].id;
				const tile = this.board[x][y];
				tile.x = x;
				tile.y = y;
				allTiles.push(tile);
			}
		}
		return allTiles;
	}

	cycleTile(x: number, y: number) {
		const currentTile = this.board[x][y];

		const currentKey = currentTile.id;

		const keys = Object.keys(this.tileSet.getTiles());

		let newKey: string = "";
		let nextKey: boolean = false;

		for (const i in keys) {
			if (newKey === "" || nextKey) {
				newKey = keys[i];
			}
			if (keys[i] == currentKey) {
				nextKey = true;
			} else {
				nextKey = false;
			}
		}

		const tile = this.cloneTile(newKey);
	 this.board[x][y] = tile;
	}

	shrinkBoard() {
		this.boardSize.shrink();
		this.board = this.correctBoardSizeChange(this.board, this.boardSize);
		return this.boardSize;
	}

	growBoard() {
		this.boardSize.grow();
		this.board = this.correctBoardSizeChange(this.board, this.boardSize);
		return this.boardSize;
	}

	correctBoardSizeChange(board, boardSize: BoardSize) {

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
					tile.needsDraw = true;
					newBoard[x][y] = tile;
				} else {
					// adding blank tiles
					const tile = this.cloneTile(1);
					tile.needsDraw = true;
					newBoard[x][y] = tile;
				}
			}
		}
		return newBoard;
	}

	getBoard() {
		return this.board;
	}
}
