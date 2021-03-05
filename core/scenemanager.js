class SceneManager {
    constructor(game) {
        this.game = game;
        this.game.camera = this;

        this.main = ASSET_MANAGER.getAsset("./sprites/mainmenu.png");
        this.title = ASSET_MANAGER.getAsset("./sprites/Fusillade.png");
        this.buttons = ASSET_MANAGER.getAsset("./sprites/GUI.png");

        this.animations = new Animator(this.main, 0, 0, 1280, 720, 15, 0.35, 0, false, true);

        this.buttonanimations = new Animator(this.buttons, 113, 81, 32, 16, 1, 1, 0, false, true);

        this.minimap = new Minimap(game, 0, 0);
        this.inventory = new Inventory(game, PARAMS.canvas_width/15, PARAMS.canvas_height/15);
        this.playonce = true;

        this.x = 0;
        this.y = 0;
        this.offsetx = 0;
        this.offsety = 0;
        this.rotation = 0;
        this.char = null;
        this.camlock = true;
        this.debug = false;  // for map layout debug
        this.rooms = null;
        this.map = null; // map of terrain: 0 = obstacles, 1 = open space
        this.tempObstacles = null;
        this.locked = false;
        this.level = 1;
        this.stage = 1; // stage 1 = start, stage 2 = miniboss, stage 3 = boss
        this.gameover = true;
        this.merchant = null;

        if (this.debug) {
            var t = createLevel2(100, 100);
            this.test = t[0];
            this.rooms = t[1];
            console.log(this.rooms);
        } else {
            //this.loadSandbox();
        }
    };
    
    /**
     * Load Level 1.
     * 
     * @param {*} x starting point of main char 
     * @param {*} y starting point of main char
     */
    loadLevel1() {
        this.game.entities = [];
        this.game.background = [];
        this.gameover = false;
        this.stage = 1;
        this.tempObstacles = null;
        this.locked = false;
        this.level = 1;

        var w = 100;
        var h = 75;
        //var m = this.createPerlinMap(w, h);
        //var threshold = 0.3;

        var rooms = createLevel1(w, h);
        var m = rooms[0];
        rooms = rooms[1];
        this.rooms = rooms;
        this.map = m;
        // property for the trees
        var scale = 2;
        var p = { spritesheet: ASSET_MANAGER.getAsset("./sprites/forest_tiles.png"), sx: 0, sy: 192, width: 64, height: 64, scale: scale/ (64/32), 
                    bound: {x: 0, y: 0, w: 1, h: 1}};

        for (var i = 0; i < m.length; i++) {
            for (var j = 0; j < m[0].length; j++) {
                // determine if flower (25%) 
                var sx = 0;
                var sy = 0;
                var grass = randomInt(4) === 1 ? true : false;
                if (grass) {
                    while (sx === 0 && sy === 0) {
                        sx = randomInt(5);
                        sy = randomInt(3);
                    }
                }
                // property for grasses
                var gp = { spritesheet: ASSET_MANAGER.getAsset("./sprites/forest_tiles.png"), sx: 32 * sx, sy: 32 * sy, width: 32, height: 32, scale: scale / (32/32)};
                var bg = new Ground(this.game, j * 32 * scale, i * 32 * scale, gp);
                this.game.addBg(bg);
                if (m[i][j] === 0) {
                    // check surround, only assign bound if reachable to player:
                    // a space is a block if 1 of 4 neighbors is empty
                    if ((m[i-1] !== undefined && m[i-1][j] === 1) ||
                            (m[i+1] !== undefined && m[i+1][j] === 1) ||
                            (m[i] !== undefined && m[i][j-1] === 1) ||
                            (m[i] !== undefined && m[i][j+1] === 1)) {
                        var tree = new Obstacle(this.game, j * 32 * scale, i * 32 * scale, p);
                        this.game.addEntity(tree);
                    } else {
                        var tree = new Ground(this.game, j * 32 * scale, i * 32 * scale, p);
                        this.game.addBg(tree);
                    }
                }
            }
        }
        // spawn main character and enemiessss
        var startRoom = rooms[7];
        var character = new Rutherford(this.game, (startRoom.x + startRoom.w/2) * 32 * scale,  (startRoom.y + startRoom.h/2) * 32 * scale, false); 
        this.char = character;

        
        rooms.forEach(r => {
            r.enemies.forEach(e => {
                if (e[0] === "ais") {
                    for (var i = 0; i < e[1]; i ++) {
                        var sx = 0;
                        var sy = 0;
                        while (m[sy][sx] === 0) {
                            sx = r.x + randomInt(Math.floor(r.w * 0.6)) + Math.floor(r.w * 0.2);
                            sy = r.y + randomInt(Math.floor(r.h * 0.6)) + Math.floor(r.h * 0.2);
                        }
                        this.game.addEntity(new Ais(this.game, sx * 32 * scale, sy * 32 * scale));
                    }
                } else if (e[0] === "fayere") {
                    for (var i = 0; i < e[1]; i ++) {
                        var sx = 0;
                        var sy = 0;
                        while (m[sy][sx] === 0) {
                            sx = r.x + randomInt(Math.floor(r.w * 0.6)) + Math.floor(r.w * 0.2);
                            sy = r.y + randomInt(Math.floor(r.h * 0.6)) + Math.floor(r.h * 0.2);
                        }
                        this.game.addEntity(new Fayere(this.game, sx * 32 * scale, sy * 32 * scale));
                    }
                } else if (e[0] === "cyclops") {
                    var enemy = new Cyclops(this.game, Math.floor(r.x + r.w/2) * 32 * scale, Math.floor(r.y + r.h/2) * 32 * scale);
                    this.game.addEntity(enemy);
                    
                } else if (e[0] === "buck") {
                    this.boss = new Buck(this.game, Math.floor(r.x + r.w/2) * 32 * scale, Math.floor(r.y + r.h/2) * 32 * scale);
                    this.game.addEntity(this.boss);
                }
            });
        });
        
        // spawn barrels and bunnies
        // barrels will only spawn next to trees
        // the more trees, the higher chance
        // the total will be purely random
        for (var i = 0; i < m.length; i++) {
            for (var j = 0; j < m[0].length; j++) {
                // i is y, j is x
                if (m[i][j] === 1) {
                    // count trees surround
                    var count = 0;
                    for (var a = i - 1; a <= i + 1; a++) {
                        for (var b = j - 1; b <= j + 1; b++) {
                            if (m[a] !== undefined && m[a][b] !== undefined && m[a][b] === 0)
                                count++;
                        }
                    }
                    // spawn barrels
                    var base = 0.01; // 1%
                    if (Math.random() < base * count) {
                        var pool = ["red", "sred", "blue", "sblue", "fayere", "onecoin", "threecoin"];
                        this.game.addEntity(new Barrel(this.game, j*32*scale, i*32*scale, pool[randomInt(pool.length)]));
                    }
                    // spawn bunnies
                    base = 0.001;
                    if (Math.random() < base * count) {
                        this.game.addEntity(new Bunny(this.game, j*32*scale, i*32*scale));
                    }
                }
            }
        } 

        this.merchant = new Merchant(this.game, 840, 4100, 1);
        this.game.addEntity(this.merchant);

        this.game.addEntity(character);

        // lock the boss room from the beginning
        this.tempObstacles = lockRoom(this.game, this.rooms[8], this.map, p);
        
        //this.game.addEntity(new Slippey(this.game, character.x- 500, character.y));
        ASSET_MANAGER.pauseBackgroundMusic();
        ASSET_MANAGER.playAsset("./sounds/music/greenpath-ambient.mp3");
        ASSET_MANAGER.autoRepeat("./sounds/music/greenpath-ambient.mp3");
    };

    /**
     * Load Level 2.
     * 
     * @param {*} x starting point of main char 
     * @param {*} y starting point of main char
     */
    loadLevel2() {
        this.game.entities = [];
        this.game.background = [];
        this.gameover = false;
        this.stage = 1;
        this.tempObstacles = null;
        this.locked = false;
        this.level = 2;

        var w = 120;
        var h = 120;
        //var m = this.createPerlinMap(w, h);
        //var threshold = 0.3;

        var rooms = createLevel2(w, h);
        var m = rooms[0];
        rooms = rooms[1];

        this.rooms = rooms;
        this.map = m;
        
        // right now this is just an empty space
        var scale = 2;
        
        // brick
        var gp = { spritesheet: ASSET_MANAGER.getAsset("./sprites/dungeon.png"), sx: 480, sy: 160, width: 32, height: 32, scale: scale / (32/32)};
        var gp1 = { spritesheet: ASSET_MANAGER.getAsset("./sprites/dungeon.png"), sx: 160, sy: 256, width: 32, height: 32, scale: scale / (32/32)};

        for (var i = 0; i < m.length; i++) {
            for (var j = 0; j < m[0].length; j++) {
                if (m[i][j] === 1) {
                    var bg = new Ground(this.game, j * 32 * scale, i * 32 * scale, ((i + j) % 2 === 0) ? gp : gp1);
                    this.game.addBg(bg);
                }
                else {
                    // choose sprite for room's edge here
                    // property for the obstacles
                    var p = { spritesheet: ASSET_MANAGER.getAsset("./sprites/dungeon.png"), sx: 32, sy: 32, width: 32, height: 32, scale: scale/ (32/32), 
                        bound: {x: 0, y: 0, w: 1, h: 1}};

                    
                    // check surround, only assign bound if reachable to player:
                    // a space is a block if 1 of 4 neighbors is empty
                    if ((m[i-1] !== undefined && m[i-1][j] === 1) ||
                            (m[i+1] !== undefined && m[i+1][j] === 1) ||
                            (m[i] !== undefined && m[i][j-1] === 1) ||
                            (m[i] !== undefined && m[i][j+1] === 1)) {
                        var space = new Obstacle(this.game, j * 32 * scale, i * 32 * scale, p);
                        this.game.addEntity(space);
                    } else {
                        this.game.addBg(new Ground(this.game, j * 32 * scale, i * 32 * scale, p));
                    }
                    
                }
            }
        }
        // spawn main character and enemiessss
        var start;
        var end;
        for (var i = 0; i < rooms.length; i++) {
            if (rooms[i].key === "start") {
                start = rooms[i];
            } else if (rooms[i].key === "end") {
                end = rooms[i];
            }
        }

        var character = new Rutherford(this.game, (start.x + start.w/2) * 32 * scale,  (start.y + start.h/2) * 32 * scale, false); 
        this.char = character;
        

        /*
        rooms.forEach(r => {
            r.enemies.forEach(e => {
                if (e[0] === "ais") {
                    for (var i = 0; i < e[1]; i ++) {
                        var sx = 0;
                        var sy = 0;
                        while (m[sy][sx] === 0) {
                            sx = r.x + randomInt(Math.floor(r.w * 0.6)) + Math.floor(r.w * 0.2);
                            sy = r.y + randomInt(Math.floor(r.h * 0.6)) + Math.floor(r.h * 0.2);
                        }
                        this.game.addEntity(new Ais(this.game, sx * 32 * scale, sy * 32 * scale));
                    }
                } else if (e[0] === "fayere") {
                    for (var i = 0; i < e[1]; i ++) {
                        var sx = 0;
                        var sy = 0;
                        while (m[sy][sx] === 0) {
                            sx = r.x + randomInt(Math.floor(r.w * 0.6)) + Math.floor(r.w * 0.2);
                            sy = r.y + randomInt(Math.floor(r.h * 0.6)) + Math.floor(r.h * 0.2);
                        }
                        this.game.addEntity(new Fayere(this.game, sx * 32 * scale, sy * 32 * scale));
                    }
                } else if (e[0] === "cyclops") {
                    var enemy = new Cyclops(this.game, Math.floor(r.x + r.w/2) * 32 * scale, Math.floor(r.y + r.h/2) * 32 * scale);
                    this.game.addEntity(enemy);
                    
                } else if (e[0] === "buck") {
                    this.boss = new Drumbuck(this.game, Math.floor(r.x + r.w/2) * 32 * scale, Math.floor(r.y + r.h/2) * 32 * scale);
                    this.game.addEntity(this.boss);
                }
            });
        });
        */
        // spawn barrels and bunnies
        // barrels will only spawn next to trees
        // the more trees, the higher chance
        // the total will be purely random
        for (var i = 0; i < m.length; i++) {
            for (var j = 0; j < m[0].length; j++) {
                // i is y, j is x
                if (m[i][j] === 1) {
                    // count trees surround
                    var count = 0;
                    for (var a = i - 1; a <= i + 1; a++) {
                        for (var b = j - 1; b <= j + 1; b++) {
                            if (m[a] !== undefined && m[a][b] !== undefined && m[a][b] === 0)
                                count++;
                        }
                    }
                    // spawn barrels
                    var base = 0.01; // 1%
                    if (Math.random() < base * count) {
                        var pool = ["red", "sred", "blue", "sblue", "fayere", "onecoin", "threecoin"];
                        this.game.addEntity(new Barrel(this.game, j*32*scale, i*32*scale, pool[randomInt(pool.length)]));
                    }
                    /*
                    // spawn bunnies
                    base = 0.001;
                    if (Math.random() < base * count) {
                        this.game.addEntity(new Bunny(this.game, j*32*scale, i*32*scale));
                    }
                    */
                }
            }
        } 
        
        //this.merchant = new Merchant(this.game, character.x, character.y, 1);
        //this.game.addEntity(this.merchant);

        this.game.addEntity(character);

        //this.game.addEntity(new Drumbuck(this.game, character.x, character.y));

        //this.tempObstacles = lockRoom(this.game, this.rooms[8], this.map, this.tree);
        var knifes = [];
        for (var i = 0; i < start.w*2; i++) {
            var k = new KnifePortal(this.game, start.x * 64 + 32 * i, start.y * 64);
            this.game.addEntity(k);
            knifes.push(k);
        }
        this.game.addEntity(new Dummy(this.game, character.x, character.y, knifes));
        ASSET_MANAGER.pauseBackgroundMusic();
        ASSET_MANAGER.playAsset("./sounds/music/greenpath-ambient.mp3");
        ASSET_MANAGER.autoRepeat("./sounds/music/greenpath-ambient.mp3");
    };

    update() {
        if (this.game.started) {
            // update camera
            if (!this.debug) {
                this.x = this.char.x - PARAMS.canvas_width/2 + 25;
                this.y = this.char.y - PARAMS.canvas_height/2 + 25;

                if (this.game.mouse && !this.camlock) {
                    var dx = this.game.mouse.x - PARAMS.canvas_width/2;
                    if (Math.abs(dx) / 100 > 1 && Math.abs(this.offsetx + dx / 100) < PARAMS.canvas_width / 5) {
                        this.offsetx += dx / 100;
                    }

                    var dy = this.game.mouse.y - PARAMS.canvas_height/2;
                    if (Math.abs(dy) / 100 > 1 && Math.abs(this.offsety + dy / 100) < PARAMS.canvas_height / 5) {
                        this.offsety += dy / 100;
                    }
                }
                this.x += this.offsetx;
                this.y += this.offsety;
            }

            
            if (this.level === 1) {
                // check if rutherford enters miniboss room
                if (this.stage === 1 && this.isInRoom(this.rooms[0])) {
                    ASSET_MANAGER.pauseBackgroundMusic();
                    ASSET_MANAGER.playAsset("./sounds/music/greenpath-action.mp3");
                    ASSET_MANAGER.autoRepeat("./sounds/music/greenpath-action.mp3");
                    this.stage = 2;
                    this.releaseLock();
                }
                // check if rutherford is in boss room
                else if (this.stage === 2 && this.isInRoom(this.rooms[8])) {
                    // sprite for tree
                    var p = { spritesheet: ASSET_MANAGER.getAsset("./sprites/forest_tiles.png"), sx: 0, sy: 192, width: 64, height: 64, scale: 1, 
                                bound: {x: 0, y: 0, w: 1, h: 1}};
                    this.tempObstacles = lockRoom(this.game, this.rooms[8], this.map, p);
                    this.locked = true;
                    ASSET_MANAGER.pauseBackgroundMusic();
                    ASSET_MANAGER.playAsset("./sounds/music/buck.mp3");
                    ASSET_MANAGER.autoRepeat("./sounds/music/buck.mp3");
                } else if (this.boss && this.boss.removeFromWorld && this.char.hp.current > 0) {
                    this.boss = null;
                    ASSET_MANAGER.pauseBackgroundMusic();
                    ASSET_MANAGER.playAsset("./sounds/music/greenpath-ambient.mp3");
                    ASSET_MANAGER.autoRepeat("./sounds/music/greenpath-ambient.mp3");
                    this.releaseLock();
                    this.stage = 3;
                }
            } else if (this.level === 2) {
                // level 2 interaction here
            }
            
        }  
    };

    draw(ctx) {
        if(this.debug) {
            var scale = 5;
            for (var i=0; i < this.test.length; i++) {
                for (var j = 0; j < this.test[0].length; j++) {
                    if (this.test[i][j] === 1) {
                        ctx.fillStyle = "black";
                        ctx.fillRect(j * scale, i * scale , scale, scale);
                    } 
                }
            }
            for (var i = 0; i < this.rooms.length; i++) {
                ctx.fillStyle = "red";
                ctx.lineWidth = 10;
                ctx.fillText(i, this.rooms[i].x * scale, this.rooms[i].y * scale);
            }
        } else if (!this.game.started) {
            if(this.playonce)
                ASSET_MANAGER.playAsset("./sounds/music/maintheme.mp3");
                ASSET_MANAGER.autoRepeat("./sounds/music/maintheme.mp3");
                this.playonce = false;
            ctx.font = "BOLD 40px Comic Sans";
            this.animations.drawFrame(this.game.clockTick, this.game.ctx, 0, 0, 1);
            //START BUTTON
            this.buttonanimations.drawFrame(this.game.clockTick, this.game.ctx, PARAMS.canvas_width *0.43, PARAMS.canvas_height*0.65, 6);
            //EXTRA BUTTON
            this.buttonanimations.drawFrame(this.game.clockTick, this.game.ctx, PARAMS.canvas_width *0.43, PARAMS.canvas_height*0.82, 6);
            ctx.drawImage(this.title, PARAMS.canvas_width*0.355, PARAMS.canvas_height*0.07, 354, 145);
            ctx.fillStyle = "#A9A9A9";
            //If our mouse has come on canvas
            if(this.game.hover != null) {
                //If we are hovering over button.
                if(this.game.hover.x >= PARAMS.canvas_width*0.42 && this.game.hover.x < PARAMS.canvas_width*0.57) {
                    if(this.game.hover.y >= PARAMS.canvas_height*0.65 && this.game.hover.y < PARAMS.canvas_height*0.75) {
                        ctx.fillStyle = "#ffffff";
                    }
                }
            }
            ctx.lineWidth = 10;
            ctx.fillText("START", PARAMS.canvas_width*0.45, PARAMS.canvas_height*0.72);
            ctx.fillText("EXTRA", PARAMS.canvas_width*0.445, PARAMS.canvas_height*0.89);
            //If our mouse has clicked canvas
            if(this.game.click != null) {
                //If we are clicking in range load lvl 1.
                if(this.game.click.x >= PARAMS.canvas_width*0.42 && this.game.click.x < PARAMS.canvas_width * 0.57) {
                    if(this.game.click.y >= PARAMS.canvas_height * 0.65 && this.game.click.y < PARAMS.canvas_height*0.75) {
                        this.game.started = true;
                        this.loadLevel1();
                    }
                }
            }
        } 

        if(this.game.started) {
            this.minimap.draw(ctx);
            this.inventory.draw(ctx);
        }
    }

    releaseLock() {
        this.tempObstacles.forEach(e => {
            e.removeFromWorld = true;
        });
        this.locked = false;
    }

    isInRoom(room) {
        return (this.char !== undefined && room !== undefined &&
            this.char.x / 64 > room.x && this.char.x/64 < room.x + room.w &&
            this.char.y / 64 > room.y && this.char.y/64 < room.y + room.h &&
            !this.locked);
    }
};


class Minimap {
    constructor(game, x, y) {
        Object.assign(this, { game, x, y});

        this.spritesheet = ASSET_MANAGER.getAsset("./sprites/minimap.png");
        this.scale = 1.5;
        // SHOULD ALWAYS BE AN ODD NUMBER
        this.size = 29*this.scale; // map pixel size, how many things gonna be on the screen
        this.psize = 7 / this.scale;  // size of each pixel

        this.x = Math.round(PARAMS.canvas_width * (1 - 1/20) - 29 * 7);
        this.y = Math.round(PARAMS.canvas_height / 20);
    };

    updateScale(value) {
        this.scale += value;

        if (this.scale > 2) this.scale = 2;
        if (this.scale < 1) this.scale = 1;

        this.size = 29*this.scale; // map pixel size, how many things gonna be on the screen
        this.psize = 7 / this.scale;  // size of each pixel
    };

    draw(ctx) {
        
        
        // calculate rutherford current coordinatea
        var cx = this.game.camera.char.x / 64;
        var cy = this.game.camera.char.y / 64;

        // use the generated map to draw the terrain first
        for(var i = Math.round(cy) - Math.round((this.size-1)/2); i <= Math.round(cy) + Math.round((this.size-1)/2); i++) {
            for (var j = Math.round(cx) - Math.round((this.size-1)/2); j <= Math.round(cx) + Math.round((this.size-1)/2); j++) {
                if (this.game.camera.map[i] !== undefined && this.game.camera.map[i][j] === 1) {
                    if (this.game.camera.level === 1) {
                        ctx.fillStyle = "#00b530";
                    } else if (this.game.camera.level === 2) {
                        ctx.fillStyle = "darkgrey";
                    }
                }
                else { 
                    if (this.game.camera.level === 1) {
                        ctx.fillStyle = "darkgreen";
                    } else if (this.game.camera.level === 2) {
                        ctx.fillStyle = "#454545";
                    }
                }
                ctx.fillRect(this.x + (j - cx + (this.size-1)/2) * this.psize, 
                    this.y + (i- cy + (this.size-1)/2) * this.psize, this.psize, this.psize);
            }
        }
        
        // draw entities
        this.game.entities.forEach(e => {
            if ((e instanceof Enemy) &&
                    this.isInMapRange(cx, cy, e.x, e.y)) {
                ctx.fillStyle = "red";
                ctx.fillRect(this.x + (e.x/64 - cx + (this.size-1)/2) * this.psize, 
                        this.y + (e.y/64 - cy + (this.size-1)/2) * this.psize, this.psize, this.psize);
            } else if (e instanceof Barrel && this.isInMapRange(cx, cy, e.x, e.y)) {
                ctx.fillStyle = "yellow";
                ctx.fillRect(this.x + (e.x/64 - cx + (this.size-1)/2) * this.psize, 
                        this.y + (e.y/64 - cy + (this.size-1)/2) * this.psize, this.psize, this.psize);
            }

            /*
            if (e instanceof Obstacle) {
                var x = Math.round(e.x/64);
                var y = Math.round(e.y/64);
                if (x >= cx - (this.size-1)/2 && x <= cx + (this.size-1)/2 &&
                    y >= cy - (this.size-1)/2 && y <= cy + (this.size-1)/2) {

                    if (this.game.camera.map[y] !== undefined && this.game.camera.map[y][x] === 1) {
                        ctx.fillStyle = "green";
                    } else {
                        ctx.fillStyle = "darkgreen";
                    }

                    ctx.fillRect(this.x + (x - cx + (this.size-1)/2) * this.scale, 
                        this.y + (y - cy + (this.size-1)/2) * this.scale, this.scale, this.scale);
                }
            }
            */
        });

        // draw rutherford
        ctx.fillStyle = "darkblue";

        ctx.fillRect(this.x + 28 * 7 / 2, 
                    this.y + 28 * 7 / 2, 7, 7);

        // draw map frame
        ctx.drawImage(this.spritesheet, 0, 0, 29 + 4, 29 + 4, this.x - this.psize * 2 * this.size /29, this.y - this.psize * 2 * this.size /29, (29+4) * this.psize * this.size /29, (29+4) * this.psize * this.size /29);
        ctx.strokeStyle = "Black";
        ctx.lineWidth = 5; // to cover the map bug lmaooooooo
        ctx.strokeRect(this.x  , this.y , this.size * this.psize, this.size * this.psize);
        ctx.lineWidth = 1; // return the stroke size back
    }

    // check if entity is within rutherford range to draw in mapa
    isInMapRange(cx, cy, ex, ey) {
        var x = ex/64;
        var y = ey/64;
        return x >= cx - (this.size-1)/2 && x <= cx + (this.size-1)/2 &&
            y >= cy - (this.size-1)/2 && y <= cy + (this.size-1)/2;
    }
};

/**
 * Inventory display on screen.
 */
class Inventory {
    constructor(game, x, y) {
        Object.assign(this, {game, x, y});

        this.uisheet = ASSET_MANAGER.getAsset("./sprites/GUI.png");
        this.itemsheet = ASSET_MANAGER.getAsset("./sprites/Meat.png");
        this.scale = 1.75;
        
        // regen value for each potion
        this.regen = [200, 100, 200, 100]; //Coincides with "type" variable.

        // we have 4 slots on screen
        // 1 for hp
        // 2 for mini hp
        // 3 for mp 
        // 4 for mini mp
        // this array contains the number that we currently have
        this.slots = [2 ,2 ,2, 2];
        this.current = 2;
    }

    update() {

    }

    draw(ctx) {
        var oldAlpha = ctx.globalAlpha;
        

        // custom properties for each item
        var p = [{sx: 32, ox: -5}, {sx: 64, ox: -2}, {sx: 48, ox: 1}, {sx: 80, ox: 4}];

        for (var i = 0; i < this.slots.length; i++) {
            var extrascale = 1; // scale when item is selected
            if (i+1 === this.current) {
                ctx.globalAlpha = 0.9;
                extrascale = 1.15;
            } else {
                ctx.globalAlpha = 0.4;
            }
            // for current selecting item, offset to simulate enlarge from center
            var offset = 30 * this.scale * (extrascale-1)/2;
            // draw ui
            ctx.drawImage(this.uisheet, 81, 97, 30, 30, this.x  + 36*i*this.scale - offset, this.y - offset, 30 * this.scale * extrascale, 30 * this.scale * extrascale);

            // draw item
            ctx.drawImage(this.itemsheet, p[i].sx, 160, 16, 16, this.x + 38*i*this.scale - p[i].ox - offset, this.y - offset, 16 * this.scale * 1.5 * extrascale, 16 * this.scale * 1.5 * extrascale);

            // draw number
            ctx.globalAlpha = 1;
            ctx.fillStyle = "white";
            // item count
            ctx.font = `${10*extrascale}px Comic Sans MS`;
            ctx.fillText(this.slots[i], this.x + 38*i*this.scale - p[i].ox + 3 - offset/3, this.y + 25 * this.scale + offset/3);
            // item key
            ctx.font = `${14*extrascale}px Comic Sans MS`;
            ctx.fillText(i + 1, this.x + 38*i*this.scale - p[i].ox - 3 - offset, this.y + 8 * this.scale - offset);
        }
        
        ctx.globalAlpha = oldAlpha;
    }

    useItem() {
        var ruth = this.game.camera.char;
        if (ruth.action !== 7) {
            var current = this.current - 1;
            if (this.slots[current] > 0) {
                if(current === 0 || current === 1) {
                    // make sure potion dont overheal
                    var heal = ruth.hp.maxHealth - ruth.hp.current;
                    ruth.hp.current += (heal < this.regen[current] ? heal : this.regen[current]);
                    this.game.addEntity(new Score(this.game, ruth.bound.x + ruth.bound.w/2, ruth.bound.y, this.regen[current], 0));
                } else {
                    var heal = ruth.hp.maxMana - ruth.hp.currMana;
                    ruth.hp.currMana += (heal < this.regen[current] ? heal : this.regen[current]);
                    this.game.addEntity(new Score(this.game, ruth.bound.x + ruth.bound.w/2, ruth.bound.y, this.regen[current], 1));
                }
                this.slots[current]--;
                ASSET_MANAGER.playAsset("./sounds/sfx/use_potion.mp3");
            } else {
                ASSET_MANAGER.playAsset("./sounds/sfx/no_potion.mp3");
            }       
        }
    }
}