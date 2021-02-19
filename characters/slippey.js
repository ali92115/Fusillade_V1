class Slippey {
    constructor(game, x, y) {
        this.spritesheet = ASSET_MANAGER.getAsset("./sprites/Slime.png");

        Object.assign(this, {game, x, y});

        this.state = 0;
        
        this.face = 0;

        this.scale = 2;

        this.isEnemy = true;

        this.transform = 0;

        this.speed = 5;

        this.attacking = false;

        this.firerate = 900;

        this.attacktimer = Date.now();

        this.enemypos = { enemyX: 0, enemyY: 0};

        this.animations = [];

        this.morphcheck = true;

        this.loadAnimations();

    }

    loadAnimations() {
        for (var i = 0; i < 4; i++) { // 4 states
            this.animations.push([]);
            for (var j = 0; j < 2; j++) { // 2 directions
                this.animations[i].push([]);
                for (var k = 0; k < 2; k++) { // 2 forms. i.e. Slime, Slimeford.
                    this.animations[i][j].push([]);
                }
            }
        }

        
        // idle animation for state = 0   
        // facing right = 0
        this.animations[0][0][0] = new Animator(this.spritesheet, 158, 0, 32, 25, 3, 0.18, 0, true, true);

        // facing left = 1
        this.animations[0][1][0] = new Animator(this.spritesheet, 256, 0, 32, 25, 3, 0.18, 0, false, true);

        // walk animation for state = 1
        // facing right = 0
        this.animations[1][0][0] = new Animator(this.spritesheet, 0, 0, 32, 25, 5, 0.18, 0, true, true);

        // facing left = 1
        this.animations[1][1][0] = new Animator(this.spritesheet, 352, 0, 32, 25, 5, 0.18, 0, false, true);

        // attack animation for state = 2
        // facing right = 0
        this.animations[2][0][0] = new Animator(this.spritesheet, 0, 27, 32, 25, 5, 0.18, 0, false, true);

        // facing left = 1
        this.animations[2][1][0] = new Animator(this.spritesheet, 352, 27, 32, 25, 5, 0.18, 0, true, true);

        // morph animation for state = 3 
        // facing right = 0
        this.animations[3][0][0] = new Animator(this.spritesheet, 160, 27, 32, 25, 3, 0.25, 0, true, false);

        // facing left = 1
        this.animations[3][1][0] = new Animator(this.spritesheet, 288, 27, 32, 25, 3, 0.25, 0, false, false);

        //idle animation for state = 0, transform = 1
        //facing right
        this.animations[0][0][1] = new Animator(this.spritesheet, 0, 0, 50, 37, 1, 0.18, 0, false, true);
        
        //facing left
        this.animations[0][1][1] = new Animator(this.spritesheet, 400, 74, 50, 37, 1, 0.18, 0, false, true);

        //run animation for state = 1, transform = 1
        //facing right
        this.animations[1][0][1] = new Animator(this.spritesheet, 0, 37, 50, 37, 6, 0.1, 0, false, true);
        
        //facing left
        this.animations[1][1][1] = new Animator(this.spritesheet, 150, 111, 50, 37, 6, 0.1, 0, true, true);

        //attack animation for state = 2, transform = 1
        //facing right
        this.animations[2][0][1] = new Animator(this.spritesheet, 0, 0, 50, 37, 9, 0.1, 0, false, true);
        
        //facing left
        this.animations[2][1][1] = new Animator(this.spritesheet, 0, 74, 50, 37, 9, 0.1, 0, true, true);

    }

    update() {
        if(this.morphcheck) {
            this.transform = Math.random() < 0.99? 1:0;
            if(this.transform == 1) {
                this.spritesheet = ASSET_MANAGER.getAsset("./sprites/Slimeford.png");
                this.loadAnimations();
            }
            this.morphcheck = false;
        }

        if(this.transform == 1) {
            if((Math.abs(this.x - this.enemyX) <= 300 && Math.abs(this.y - this.enemyY <= 300)) || this.attacking) {
                this.attacking = true;
                this.state = 2;
                this.decideDir();
                if(Date.now() - this.attacktimer > this.firerate) {
                    this.attack();
                    this.attacking = false;
                    this.attacktimer = Date.now();
                    this.animations[this.state][this.face][this.transform].elapsedTime = 0;
                }
            } else if(Math.abs(this.x - this.enemyX) > 300 || Math.abs(this.y - this.enemyY > 300)) {
                if(Math.abs(this.x - this.enemyX) > 2) {
                    if(this.x < this.enemyX) {
                        this.x += this.speed;
                    } else {
                        this.x -= this.speed;
                    }
                }
                if(Math.abs(this.y - this.enemyY) > 2) {
                    if(this.y < this.enemyY) {
                        this.y += this.speed;
                    } else {
                        this.y -= this.speed;
                    }
                }
                this.state = 1;
                this.decideDir();
            } 
        }
    }   

    draw(ctx) {
        this.animations[this.state][this.face][this.transform].drawFrame(this.game.clockTick, ctx, this.x - this.game.camera.x, this.y - this.game.camera.y, this.scale);
    }

    getEnemyPos(eneX, eneY) {
        this.enemyX = eneX; 
        this.enemyY = eneY;
    }
    
    decideDir() {
        if(this.x - this.enemyX> 0) {
            this.face = 1;
        } else {
            this.face = 0;
        }
    }

    calculateVel() {
        var dx = this.enemyX - this.x;
        var dy = this.enemyY - this.y;
        var angle = Math.atan(dy/dx);

        var v = { x: Math.cos(angle),
                 y: Math.sin(angle)};
        
        if (dx < 0)
            v.x *= -1;

        if ((angle > 0 && dy < 0) || (angle < 0 && dy > 0))
            v.y *= -1;
        
        return v;
    }

    attack() {
        var velocity = this.calculateVel();
        var pp = { sx: 34, sy: 144, size: 16};
        var p = new deflectprojectile(this.game, false, this.x+20, this.y+18, velocity, 8, 6000, 25, Math.PI/5, pp);
        p.bound.r = 10;
        this.game.entities.splice(this.game.entities.length - 1, 0, p);
    }

}