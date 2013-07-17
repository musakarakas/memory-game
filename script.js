var Game = {
  init: function() {
    Game.init_options();
    Game.init_timer();
    Game.init_stats();
    Game.init_tiles();
    Game.init_state();
    View.repaint();
  },
  init_options: function() {
    Game.init_levels();
    Game.init_i18n();
  },
  init_stats: function() {
    Game.init_clicks();
    Game.reset_stats();
  },
  reset_stats: function() {
    Game.clicks.reset();
    Game.timer.reset();
    Game.matches_found = 0;
  },
  init_tiles: function() {
    Game.tiles = [];
    var n = Game.level.tile_count();
    Game.timer.set_max_time(n * 4);
    for (var i = 0; i < n; i++)
      Game.tiles[i] = new Tile(i % (n / 2));
    View.draw_tiles();
  },
  reset_tiles: function() {
    for (var i = 0; i < Game.tiles.length; i++)
      Game.tiles[i].reset();
    Game.shuffle_tiles();
    Game.repaint_tiles();
  },
  init_levels: function() {
    var level = 4;
    $('#level-up').click(next);

    Game.level = {tile_count: tile_count,
      display: display, reset: reset, next: next, level: get};

    function reset() {
      level = 4;
    }
    function tile_count() {
      return Math.pow(level, 2) - (level % 2);
    }
    function next() {
      level = (level - 2) % 6 + 3; // 4 -> 5 -> 6 -> 7 -> 8 -> 3 -> 4
      Game.init_tiles();
      Game.reset_stats();
      View.repaint();
    }
    function get() {
      return level;
    }
    function display() {
      var $btn = $('#level-up');
      Game.state.over() ? Utils.enable_button($btn) : Utils.disable_button($btn);
      $('#level').text(level + ' x ' + level);
      var klass = level > 5 ? 'icon-th' : 'icon-th-large';
      $('#level-up i').removeClass().addClass(klass);
    }
  },
  init_i18n: function() {
    set_language();
    $('#language').click(set_language);
    function set_language() {
      var lng = i18n.lng() === 'en' ? 'tr' : 'en';
      var options = {lng: lng, fallbackLng: 'en', postProcess: 'sprintf'};
      i18n.init(options, function() {
        $('body').i18n();
      });
    }
  },
  init_timer: function() {
    var interval = null, time = 0, max_time = 0;
    Game.timer = {start: start, stop: stop, reset: reset,
      time: get_time, set_max_time: set_max_time, display: display};

    function start() {
      reset();
      interval = setInterval(function() {
        time++;
        display();
        if (time >= max_time)
          Game.state.end(false);
      }, 1000);
    }
    function stop() {
      clearInterval(interval);
    }
    function reset() {
      stop();
      time = 0;
    }
    function get_time() {
      return time;
    }
    function set_max_time(t) {
      max_time = t;
    }
    function display() {
      $('#seconds-left').text(max_time - time);
    }
  },
  init_clicks: function() {
    var count = 0;
    reset();
    Game.clicks = {reset: reset, increment: increment, value: get, is_odd: odd};

    function get() {
      return count;
    }
    function set(n) {
      count = n;
      display();
    }
    function reset() {
      set(0);
    }
    function increment() {
      set(count + 1);
    }
    function odd() {
      return count % 2 === 1;
    }
    function display() {
      $('#clicks').text(count);
    }
  },
  init_state: function() {
    var over = true;
    Game.state = {end: end_game, over: is_over, display: display};

    $('#start-game').click(function() {
      Game.reset_stats();
      Game.reset_tiles();
      Game.timer.start();
      over = false;
      $('#window').removeClass('overlay');
      View.repaint();
    });
    $('#end-game').click(function() {
      if (!Game.matches_found || window.confirm(i18n.t('are-you-sure')))
        end_game();
    });
    $(window).resize(function() {
      View.resize();
    });
    function end_game(win) {
      Game.timer.stop();
      Game.disable_tiles();
      over = true;
      if (arguments.length) {
        var params = {sprintf: [Game.clicks.value(), Game.timer.time()]};
        alert(i18n.t(win ? 'you-win' : 'you-lose', params));
      }
      View.repaint();
    }
    function is_over() {
      return over;
    }
    function display() {
      $('#start-game').toggleClass('invisible', !over);
      $('#end-game').toggleClass('invisible', over);
    }
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
    return Game.matches_found === Game.level.tile_count() / 2;
  },
  click_tile: function(tile) {
    Game.clicks.increment();
    Game.clicks.is_odd() ? first_click() : second_click();
    function first_click() {
      Game.repaint_tiles();
      tile.show();
      Game.tile_to_match = tile;
    }
    function second_click() {
      tile.show();
      if (tile.id === Game.tile_to_match.id)
        match_found();
      else
        hide(Game.tile_to_match, tile);
    }
    function match_found() {
      Game.matches_found++;
      Game.tile_to_match.matched = tile.matched = true;
      if (Game.all_matches_found())
        Game.state.end(true);
    }
    function hide(first_tile, second_tile) {
      setTimeout(function() {
        first_tile.hide();
        second_tile.hide();
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
    if (Game.state.over())
      Game.disable_tiles();
  }
};

var View = {
  draw_tiles: function() {
    $('#tiles').empty();
    for (var i = 0; i < Game.tiles.length; i++)
      Game.tiles[i].$button.appendTo($('#tiles'));
    var tile_size = (100 / Game.level.level()) + '%';
    $('#tiles button').css({'width': tile_size, 'height': tile_size});
  },
  repaint: function() {
    View.resize();
    View.repaint_stats();
    Game.repaint_tiles();
  },
  repaint_stats: function() {
    Game.timer.display();
    Game.level.display();
    Game.state.display();
  },
  resize: function() {
    var w = $(window).width(), h = $(window).height(), size;
    w > h ? set_wide_size() : set_narrow_size();
    set_font_size();
    function set_wide_size() {
      size = Math.min(w * 4 / 5, h) * .99;
      $('#window').css({
        'width': size * 5 / 4, 'height': size,
        'margin-top': (h - size) / 2
      });
      $('#window').removeClass('narrow');
      $('#window').addClass('wide');
    }
    function set_narrow_size() {
      size = Math.min(w, h * 4 / 5) * .99;
      $('#window').css({
        'width': size, 'height': size * 5 / 4,
        'margin-top': (h - size * 5 / 4) / 2
      });
      $('#window').removeClass('wide');
      $('#window').addClass('narrow');
    }
    function set_font_size() {
      var font_size = Math.floor(size / 5) + '%';
      $('body').css('font-size', font_size);
      $('body').css('line-height', $('body').css('font-size'));
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
    this.$button.addClass('visible');
    this.disable();
  },
  hide: function() {
    this.$image.hide();
    this.$button.removeClass('visible');
    Utils.enable_button(this.$button);
  },
  disable: function() {
    Utils.disable_button(this.$button);
  },
  set_id: function(id) {
    this.id = id;
    this.$image.attr('src', 'images/' + (id + 1) + '.png');
  }
});

var Utils = {
  enable_button: function($button) {
    $button.removeAttr('disabled');
  },
  disable_button: function($button) {
    $button.attr('disabled', 'disabled');
  }
};

$(function() {
  Game.init();
});
