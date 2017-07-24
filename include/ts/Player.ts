function Player(params: object, map: Map, renderer: Renderer, jetpack: Jetpack, collisions: Collisions) {
	
	var self = this;

	this.construct = function(params: object, map: Map, renderer: Renderer, jetpack: Jetpack, collisions: Collisions) {
		for (var i in params) {
			this[i] = params[i];
		}
		this.map = map;
		this.renderer = renderer;
		this.jetpack = jetpack;
		this.collisions = collisions;
	}

	this.doCalcs = function() {
		this.setRedrawAroundPlayer();
		this.incrementPlayerFrame();
	    this.checkFloorBelowPlayer();
	    this.incrementPlayerDirection();	
	    this.checkPlayerCollisions();
	}

	this.setRedrawAroundPlayer = function() {
		// first just do the stuff around player
		for (var x = this.x - 1; x < this.x + 2; x++) {
			for (var y = this.y - 1; y < this.y + 2; y++) {
				var coords = this.map.correctForOverflow(x,y);
				this.map.board[coords.x][coords.y].needsDraw = true;
			}
		}
	}

	this.incrementPlayerFrame = function() {
		if (this.direction===0 && this.oldDirection===0 && this.currentFrame===0) {
			// we are still, as it should be
			return false;
		}
		if (this.direction===0 && this.currentFrame===0) {
			// if we're still, and have returned to main frame, disregard old movement
			this.oldDirection=0;
		}

		// if going left, reduce frame
		if (this.direction < 0 || this.oldDirection < 0) {
			this.currentFrame --;
			if (this.currentFrame <0) this.currentFrame=(this.frames -1);
		}

		// if going left, reduce frame
		if (this.direction > 0 || this.oldDirection > 0) {
			this.currentFrame++;
		    if (this.currentFrame >= this.frames) this.currentFrame = 0;
		}
	}

	this.checkPlayerTileAction = function() {
		if (this.offsetX != 0 || this.offsetY != 0) return false;

		var board = this.map.board;

		var tile = board[this.x][this.y];
		var collectable = this.map.getTileProperty(tile,'collectable');
		if (collectable) {
			var score = collectable * this.multiplier;
			var blankTile = this.map.getTile(1);
			blankTile.needsDraw = true;
			board[this.x][this.y] = blankTile;
			this.jetpack.addScore(score);
		}

		if (this.falling) {
			var coords=this.map.correctForOverflow(this.x, this.y + 1);
			
			var tile = board[coords.x][coords.y];

			if (this.map.tileIsBreakable(tile)) {
				board[coords.x][coords.y] = this.map.getTile(1); // smash block, replace with empty
			}
		} else {
			var tile = board[this.x][this.y];
			var action = this.map.getTileAction(tile);
				
			console.log('tileAction', action);

			if (action=='rotateLeft') {
				this.jetpack.rotateBoard(false);
			} else if (action=='rotateRight') {
				this.jetpack.rotateBoard(true);
			} else if (action=='completeLevel') {
				this.jetpack.completeLevel();
			}
		}
	}

	this.checkPlayerCollisions = function() {
		for (var i in this.jetpack.players) {
			var player = this.jetpack.players[i];
			this.collisions.checkCollision(this, player);	
		}
	}

	this.incrementPlayerDirection = function() {

		if (this.falling) return false;
		/*
		if (this.direction !== 0 && !this.checkTileIsEmpty(this.x - 1, this.y) && !this.checkTileIsEmpty(this.x + 1, this.y)) {
			// trapped
			this.oldDirection = this.direction;
			this.direction = 0;
			return false;
		}*/

		if (this.direction < 0) {
			if (!this.map.checkTileIsEmpty(this.x - 1, this.y)) {
				// turn around
				this.direction = 1;
			} else {
				// move
				this.offsetX-=this.moveSpeed;
			}
		}

		if (this.direction > 0) {
			if (!this.map.checkTileIsEmpty(this.x + 1, this.y)) {
				// turn around
				this.direction = -1;
			} else {
				// move
				this.offsetX+=this.moveSpeed;;
			}
		}

		// if we've stopped and ended up not quite squared up, correct this
		if (this.direction ==0 && this.falling==false) {
			if (this.offsetX > 0) {
				this.offsetX -= this.moveSpeed;
			} else if (this.offSetX < 0) {
				this.offsetX += this.moveSpeed;
			}
		}
		this.checkIfPlayerIsInNewTile();
	}

	this.checkIfPlayerIsInNewTile = function() {
		if (this.offsetX > this.renderer.tileSize) {
			this.offsetX = 0;
			this.checkPlayerTileAction();
			this.x ++;
		}
		if (this.offsetX < (-1 * this.renderer.tileSize)) {
			this.offsetX = 0;
			this.checkPlayerTileAction();
			this.x --;
		}
		if (this.offsetY > this.renderer.tileSize) {
			this.offsetY = 0;
			this.checkPlayerTileAction();
			this.y ++;
		}
		if (this.offsetY < (-1 * this.renderer.tileSize)) {
			this.offsetY = 0;
			this.checkPlayerTileAction();
			this.y --;
		}
		// have we gone over the edge?
		var coords = this.map.correctForOverflow(this.x, this.y);
		this.x = coords.x;
		this.y = coords.y;
	}

	this.checkFloorBelowPlayer = function() {
		
		if (this.offsetX !== 0) return false;

		var coords = this.map.correctForOverflow(this.x, this.y + 1);

		var tile = this.map.board[coords.x][coords.y];

		if (tile.background) {
			this.falling = true;
			this.offsetY += this.moveSpeed;
		} else if (this.falling && this.map.tileIsBreakable(tile)) {
			this.offsetY += this.moveSpeed;
		} else {
			this.falling = false;
			this.checkPlayerTileAction();
		}

		this.checkIfPlayerIsInNewTile();
	}

	this.construct(params, map, renderer, jetpack, collisions);

}