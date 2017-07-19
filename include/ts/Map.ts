function Map(tiles) {
	
	var self = this;

	this.tiles = tiles;

	this.boardSize = {
		width: 14,
		height: 14
	};

	this.board = [];
	
	this.construct = function() {
		var board = this.generateRandomBoard();
		this.board = this.addWaterToBoard(board);
	}

	this.correctForOverflow = function(x,y) {
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
		return {'x':newX,'y':newY};
	}

	this.getTileProperty = function(tile, property) {
		if (!tile.hasOwnProperty(property)) return false;
		return tile[property];

	}
	this.tileIsBreakable = function(tile) {
		return this.getTileProperty(tile,'breakable');
	}

	// is intended next tile empty / a wall?
	this.checkTileIsEmpty = function(x,y) {
		//var x = player.x + player.direction;
		if (x >= this.boardSize.width) {
			x = 0; // wrap around
		}

		if (x < 0) {
			x = this.boardSize.width - 1; // wrap around
		}

		var tile = this.board[x][y];

		return tile.background;
	}


	

	this.markAllForRedraw = function() {
		// force redraw
		for (var x in this.board) {
			for (var y in this.board[x]) {
				this.board[x][y].needsDraw = true;
			}
		}
	}

	this.getTileAction = function(tile) {
		return this.getTileProperty(tile,'action');
	}

	this.generateRandomBoard = function() {
		var board=[];
		for (var x =0; x < this.boardSize.width; x++) {
			board[x]=[];
			for (var y = 0; y < this.boardSize.height; y++) {
				var randomTile = this.getRandomTile(this.tiles);
				board[x][y] = randomTile;
			}
		}
		return board;
	}

	this.addWaterToBoard = function(board) {
		return board; // don't do this for now

		var bottomRow = this.boardSize.height - 1; // compensate for beginning at zero
		for (var x = 0; x < this.boardSize.width; x++) {
			var waterTile = this.getTile(1);
			board[x][bottomRow] = waterTile;
		}
		return board;
	}

	this.getTile = function(id) {
		var tile = JSON.parse(JSON.stringify(this.tiles[id])); // create copy of object so we're not changing original
		return tile;
	}

	this.getRandomTile = function(tiles) {
		var randomProperty = function (obj) {
		    var keys = Object.keys(obj);
		    var randomKey = keys[ keys.length * Math.random() << 0];
		    return self.getTile(randomKey);
		};

		var theseTiles = JSON.parse(JSON.stringify(tiles));
		// remove unwanted tiles
		for (var i in theseTiles) {
			if (this.getTileProperty(theseTiles[i],'dontAdd')) {
		    	delete theseTiles[i];
		    }
		}
		return randomProperty(theseTiles);
	}

		this.getBlankBoard = function() {
		var newBoard=[];
		for (var x =0; x < this.boardSize.width; x++) {
			newBoard[x]=[];
			for (var y = 0; y < this.boardSize.height; y++) {
				newBoard[x][y] = [];
			}
		}
		return newBoard;
	}

	this.translateRotation = function(x,y,clockwise) {
		var coords={
			x:0,
			y:0
		}
		
		var width = this.boardSize.width - 1;
		var height = this.boardSize.height - 1;

		if (clockwise) {
			// 0,0 -> 9,0
			// 9,0 -> 9,9
			// 9,9 -> 0,9
			// 0,9 -> 0,0
			coords.x = width - y;
			coords.y = x;
		} else {
			// 0,0 -> 0,9
 			// 0,9 -> 9,9
 			// 9,9 -> 9,0
 			// 9,0 -> 0,0
			coords.x = y;
			coords.y = height - x;
		}
		return coords;
	}

	this.rotateBoard = function(clockwise) {
		var newBoard=this.getBlankBoard();

		var width = this.boardSize.width -1;
		var height = this.boardSize.height -1;

		for (var x in this.board) {
			for (var y in this.board[x]) {
				var coords = this.translateRotation(x,y,clockwise)
				newBoard[coords.x][coords.y] = this.board[x][y];
				newBoard[coords.x][coords.y].needsDraw = true;
			}
		}
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


	this.rotatePlayer = function(player: Player, clockwise) {
		
		var coords = this.translateRotation(player.x, player.y, clockwise);
		
		player.x = coords.x;
		player.y = coords.y;
		player.offsetX = 0; //offsetX;
		player.offsetY = 0; //offsetY;

		// if player is still, nudge them in rotation direction
		if (player.direction==0) {
			if (clockwise) {
				player.direction = 1;
			} else {
				player.direction = -1;
			}
		}
	}
	
	this.cycleTile = function(x:number, y:number) {
		var currentTile = this.board[x][y];

		var currentKey = currentTile.id;

		var keys = Object.keys(this.tiles);
		
		var newKey = nextKey = false;
		for (var i in keys) {
			if (newKey===false || nextKey) newKey = keys[i];
			if (keys[i]==currentKey) {
				nextKey = true;
			} else {
				nextKey = false;
			}
		}
	    var tile = this.getTile(newKey);
	    this.board[x][y] = tile;
	}

	this.construct();

}