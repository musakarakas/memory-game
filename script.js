var Game = {
  init: function() {
    Game.init_options();
    Game.init_stats();
    Game.init_tiles();
    Game.init_clock();
    Game.init_actions();
    Game.set_size();
  },
  start: function() {
    Game.reset();
    $('#level').attr('disabled', 'disabled');
  },
  reset: function() {
    Game.reset_stats();
    Game.reset_tiles();
    Game.reset_clock();
  },
  init_options: function() {
    Game.level = 4;
    Game.language = 'en';
  },
  init_stats: function() {
    Game.MAX_TIME = 60;
    Game.reset_stats();
  },
  reset_stats: function() {
    Game.set_clicks(0);
    Game.set_time(0);
    Game.is_over = false;
  },
  init_tiles: function() {
    $('#tiles').empty(), Game.tiles = [];
    tile_count = Math.pow(Game.level, 2) - (Game.level % 2);
    for (var i = 0; i < tile_count; i++) {
      Game.tiles[i] = new Tile(i % (tile_count / 2));
      Game.tiles[i].$button.appendTo($('#tiles'));
    }
    var tile_size = (100 / Game.level) + '%';
    $('#tiles button').css({'width': tile_size, 'height': tile_size});
  },
  next_level: function() {
    Game.level = (Game.level - 2) % 6 + 3; // 4 -> 5 -> 6 -> 7 -> 8 -> 3 -> 4
    $('#level').text(Game.level + ' x ' + Game.level); // FIXME: View.reload()?
    Game.init_tiles();
  },
  reset_tiles: function() {
    for (var i = 0; i < Game.tiles.length; i++)
      Game.tiles[i].reset();
    Game.shuffle_tiles();
    Game.repaint_tiles();
  },
  init_clock: function() {
    Game.clock = null;
  },
  reset_clock: function() {
    clearInterval(Game.clock);
    Game.clock = setInterval(tick, 1000);
    function tick() {
      Game.set_time(Game.time + 1);
      if (Game.time >= Game.MAX_TIME)
        Game.end_game(false);
    }
  },
  init_actions: function() {
    $('#start-game').click(function() {
      Game.start();
    });
    $('#end-game').click(function() {
      Game.end_game();
    });
    $('#level').click(function() {
      Game.next_level();
    });
    $(window).resize(function() {
      Game.set_size();
    });
  },
  set_size: function() {
    var w = $(window).width(), h = $(window).height(), size;
    w > h ? set_wide_size() : set_narrow_size();
    set_font_size();

    function set_wide_size() {
      size = Math.min(w * 4 / 5, h);
      $('#window').css({'width': size * 5 / 4, 'height': size});
      $('#window').removeClass('narrow');
      $('#window').addClass('wide');
    }

    function set_narrow_size() {
      size = Math.min(w, h * 4 / 5);
      $('#window').css({'width': size, 'height': size * 5 / 4});
      $('#window').removeClass('wide');
      $('#window').addClass('narrow');
    }

    function set_font_size() {
      var font_size = Math.floor(size / 5) + '%';
      $('body').css('font-size', font_size);
      $('body').css('line-height', $('body').css('font-size'));
    }
  },
  set_clicks: function(clicks) {
    Game.clicks = clicks;
    $('#clicks').text(Game.clicks);
  },
  set_time: function(time) {
    Game.time = time;
    $('#seconds-left').text(Game.MAX_TIME - Game.time);
  },
  shuffle_tiles: function() {
    for (var i = 0; i < Game.tiles.length; i++)
      swap_tiles(i, Math.floor(Math.random() * Game.tiles.length));
    function swap_tiles(i, j) {
      var id = Game.tiles[i].id;
      Game.tiles[i].set_id(Game.tiles[j].id);
      Game.tiles[j].set_id(id);
    }
  },
  all_matches_found: function() {
    for (var i = 0; i < Game.tiles.length; i++)
      if (!Game.tiles[i].matched)
        return false;
    return true;
  },
  end_game: function(win) {
    clearInterval(Game.clock);
    Game.disable_tiles();
    Game.is_over = true;
    if (arguments.length)
      show_message();
    $('#level').removeAttr('disabled');

    function show_message() {
      var winner = "Congratulations! You win!\nNumber of clicks: " + Game.clicks
              + "\nGame was completed in " + Game.time + " seconds.";
      var loser = "Time is up!\nYou lose!\nNumber of clicks: " + Game.clicks;
      alert(win ? winner : loser);
    }
  },
  click_tile: function(tile) {
    Game.set_clicks(Game.clicks + 1);
    tile.show();
    Game.clicks % 2 === 1 ? first_click() : second_click();
    function first_click() {
      Game.tile_to_match = tile;
    }
    function second_click() {
      if (tile.id === Game.tile_to_match.id)
        match_found();
      delay();
    }
    function match_found() {
      Game.tile_to_match.matched = tile.matched = true;
      if (Game.all_matches_found())
        Game.end_game(true);
    }
    function delay() {
      Game.disable_tiles();
      setTimeout(function() {
        if (!Game.is_over)
          Game.repaint_tiles();
      }, 300);
    }
  },
  disable_tiles: function() {
    for (var i = 0; i < Game.tiles.length; i++)
      Game.tiles[i].disable();
  },
  repaint_tiles: function() {
    for (var i = 0; i < Game.tiles.length; i++) {
      if (Game.tiles[i].matched)
        Game.tiles[i].show();
      else
        Game.tiles[i].hide();
    }
  }
};

var Class = function() {
  var klass = function() {
    this.init.apply(this, arguments);
  };

  klass.prototype.init = function() {
  };

  // Shortcut to access prototype
  klass.fn = klass.prototype;

  // Shortcut to access class
  klass.fn.parent = klass;

  // Adding class properties
  klass.extend = function(obj) {
    var extended = obj.extended;
    for (var i in obj) {
      klass[i] = obj[i];
    }
    if (extended)
      extended(klass);
  };

  // Adding instance properties
  klass.include = function(obj) {
    var included = obj.included;
    for (var i in obj) {
      klass.fn[i] = obj[i];
    }
    if (included)
      included(klass);
  };

  return klass;
};

var Tile = new Class;
Tile.include({
  init: function(id) {
    var self = this;
    this.$button = $('<button/>', {class: 'tile'});
    this.$image = $('<img/>').appendTo(this.$button);
    this.$button.click(function() {
      Game.click_tile(self);
    });
    this.set_id(id);
    this.reset();
  },
  reset: function() {
    this.matched = false;
    this.$image.hide();
    this.disable();
  },
  show: function() {
    this.$image.show();
    this.disable();
  },
  hide: function() {
    this.$image.hide();
    this.$button.removeAttr('disabled');
  },
  disable: function() {
    this.$button.attr('disabled', 'disabled');
  },
  set_id: function(id) {
    this.id = id;
    this.$image.attr('src', 'images/' + (id + 1) + '.png');
  }
});

$(function() {
  Game.init();
});
