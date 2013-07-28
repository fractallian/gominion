window.Go = (function() {
    var imgRoot = "http://play.goko.com/Dominion/CardBuilder/img/",
        cardMap = {
            curse: ["frame", "curse-half", "png"],
            potion: ["default/images", "potion", "png"]
        },
        coinMap = {
            copper: 1,
            silver: 2,
            gold: 3,
            platinum: 5
        },
        vpMap = {
            estate: 1,
            duchy: 3,
            province: 6,
            colony: 10
        },
        camelCase = function(str) {
            return str.replace(/\'/g, '').replace(/([\-\s]\w)/g, function($1) {
                return $1.toUpperCase().replace(/[\-\s]/g, '');
            }).replace(/\w/, function($1) {return $1.toLowerCase();});
        };

    this.Round = function(number) {
        this.number = number;
        this.turns = [];

        this.turn = function(player) {
            var turn = this.turns[player.index];
            if (!turn) {
                turn = new Go.Turn(player, this.number);
                this.turns[player.index] = turn;
            }
            return turn;
        }
    };

    this.Turn = function(player, number) {
        this.player = player;
        this.number = number;
        this.gains = [];
        this.trashes = [];
        this.log = "";
    };

    this.Player = function(name, index) {
        this.name = name;
        this.index = index;

        this.turns = function(rounds) {
            return _.compact(_.map(rounds, function(round) {
                return round.turns[name];
            }));
        };
    };

    this.Card = function(name) {
        var imgOpts;
        this.name = camelCase(name);
        if (coinMap[this.name]) {
            this.value = coinMap[this.name];
            this.type = "coin";
            imgOpts = ["default/images", "coin-large", "png"];
        }
        if (vpMap[this.name]) {
            this.value = vpMap[this.name];
            this.type = "vp";
            imgOpts = ["default/images", "victory-point-large", "png"];
        }
        if (!this.type) {
            this.type = "basic";
            imgOpts = cardMap[this.name] || ["illustration", this.name, "jpg"];
        }
        this.imgUrl = imgRoot+imgOpts[0]+"/"+imgOpts[1]+"."+imgOpts[2];
    };


    this.Game = function(logfile) {
        var self = this,
            currentTurn,
            match;

        this.rounds = [];
        this.players = [];

        this.getPlayer = function(name) {
            return _.where(this.players, {name: name})[0];
        };

        this.round = function(number) {
            var round = this.rounds[number-1];
            if (!round) {
                round = new Go.Round(number);
                this.rounds.push(round);
            }
            return round;
        };

        this.turn = function(player, round) {
            return this.round(round).turn(player);
        };

        this.player = function(name) {
            var player = this.getPlayer(name);
            if (!player) {
                player = new Go.Player(name, this.players.length);
                this.players.push(player);
            }
            return player;
        };

        this.render = function() {
            var template = Handlebars.compile($("#main-template").html());
            Handlebars.registerPartial("card", $("#card-template").html());
            $("#main").html(template(this));
            switch(this.players.length) {
            case 2:
                $("#main").addClass("twoplayers"); break;
            case 3:
                $("#main").addClass("threeplayers"); break;
            case 4:
                $("#main").addClass("fourplayers"); break;
            }
        };

        // parse logfile
        _.each(logfile.split(/\n/), function(line, i) {
            if (match = line.match(/([\w\s]+)\s-\sstarting\scards\:/)) { // create player

                self.player(match[1]);

            } else if (match = line.match(/\-{10}\s([\w\s]+)\:\sturn\s(\d+)\s\-{10}/)) { // new turn

                currentTurn = self.turn(self.getPlayer(match[1]), match[2]);

            } else if (match = line.match(/([\w\s]+)\s\-\sgains\s([\w\s\,\']+)/)) { // gain

                _.each(match[2].split(", "), function(card) {
                    card = new Go.Card(card);
                    self.turn(self.getPlayer(match[1]), currentTurn.number).gains.push(card);
                });

            } else if (match = line.match(/([\w\s]+)\s\-\strashes\s([\w\s\,\']+)/)) { // trash

                _.each(match[2].split(", "), function(card) {
                    card = new Go.Card(card);
                    self.turn(self.getPlayer(match[1]), currentTurn.number).trashes.push(card);
                });

            } else if (match = line.match(/([\w\s]+)\s\-\stotal\svictory\spoints\:\s(\d+)/)) { // score

                self.getPlayer(match[1]).score = match[2];

            }
            if (currentTurn) {
                currentTurn.log += "<div>"+line+"</div>";
            }
        });
    };

    this.start = function(url) {
        $.get(url).success(function(response) {
            Go.game = new Go.Game(response);
            Go.game.render();
        });
    };

    return this;

}).call({});


$(function() {
    var test = "http://dominionlogs.goko.com//20130727/log.50f6de40e4b0c53c94b0c805.1374949747946.txt";
    // Go.start(test);

    $(".btn").click(function() {
        var url = $("input[name=logfile]").val();
        Go.start(url);
        return false;
    });
    $(document).on("click", ".toggle-log", function(evt) {
        $(evt.target).parent().find(".log").toggle();
        return false;
    });
});