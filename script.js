var Game = {
  init: function() {
    Game.init_window();
    Game.init_state();
    Game.init_level();
    Game.init_i18n();
    Game.init_timer();
    Game.init_clicks();
    Game.init_tiles();
    Game.repaint();
  },
  init_window: function() {
    resize();
    $(window).resize(resize);
    function resize() {
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
  },
  init_state: function() {
    var over = true;
    Game.state = {end: end_game, over: is_over, display: display};

    $('#start-game').click(function() {
      Game.tiles.reset();
      Game.clicks.reset();
      Game.timer.start();
      over = false;
      $('#window').removeClass('overlay');
      Game.repaint();
    });
    $('#end-game').click(function() {
      if (!Game.tiles.match_found() || window.confirm(i18n.t('are-you-sure')))
        end_game();
    });
    function end_game(win) {
      Game.timer.stop();
      Game.tiles.disable();
      over = true;
      if (arguments.length) {
        var params = {sprintf: [Game.clicks.value(), Game.timer.time()]};
        alert(i18n.t(win ? 'you-win' : 'you-lose', params));
      }
      Game.repaint();
    }
    function is_over() {
      return over;
    }
    function display() {
      $('#start-game').toggleClass('invisible', !over);
      $('#end-game').toggleClass('invisible', over);
    }
  },
  init_level: function() {
    var level = 4;
    $('#level-up').click(next);

    Game.level = {display: display, next: next, value: get};

    function next() {
      level = (level - 2) % 6 + 3; // 4 -> 5 -> 6 -> 7 -> 8 -> 3 -> 4
      Game.tiles.load();
      Game.clicks.reset();
      Game.timer.reset();
      Game.repaint();
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
  init_tiles: function() {
    var tiles, $tiles = $('#tiles'), tile_to_match, count, matches = 0;
    load();

    Game.tiles = {load: load, reset: reset,
      match_found: match_found, disable: disable, display: display};

    $tiles.on('click', '.tile', function() {
      click(this.tile);
    });
    function match_found() {
      return matches > 0;
    }
    function load() {
      var level = Game.level.value();
      count = Math.pow(level, 2) - (level % 2);
      Game.timer.set_max_time(count * 4);

      tiles = [];
      $tiles.empty();
      for (var i = 0; i < count; i++) {
        tiles[i] = new Tile(i % (count / 2));
        tiles[i].$button.appendTo($tiles);
      }

      var tile_size = (100 / level) + '%';
      $('#tiles button').css({'width': tile_size, 'height': tile_size});
    }
    function reset() {
      for (var i = 0; i < tiles.length; i++)
        tiles[i].reset();
      shuffle();
      matches = 0;
    }
    function shuffle() {
      for (var i = 0; i < count; i++) {
        var $tile1 = $('#tiles button').eq(i);
        var $tile2 = $('#tiles button').eq(Math.floor(Math.random() * count));
        $tile1.after($tile2);
      }
    }
    function display() {
      for (var i = 0; i < tiles.length; i++) {
        if (tiles[i].matched)
          tiles[i].show();
        else
          tiles[i].hide();
      }
      if (Game.state.over())
        disable();
    }
    function disable() {
      for (var i = 0; i < tiles.length; i++)
        tiles[i].disable();
    }
    function click(tile) {
      Game.clicks.increment();
      Game.clicks.is_odd() ? first_click() : second_click();
      function first_click() {
        display(); // OPTIMIZE: trigger hide.timeout instead
        tile.show();
        tile_to_match = tile;
      }
      function second_click() {
        tile.show();
        if (tile.id === tile_to_match.id)
          match_found();
        else
          hide(tile_to_match, tile);
      }
      function match_found() {
        matches++;
        tile_to_match.matched = tile.matched = true;
        if (matches === count / 2)
          Game.state.end(true);
      }
      function hide(first_tile, second_tile) {
        setTimeout(function() {
          first_tile.hide();
          second_tile.hide();
        }, 300);
      }
    }
  },
  repaint: function() {
    Game.timer.display();
    Game.level.display();
    Game.state.display();
    Game.tiles.display();
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
    this.id = id;
    this.$button = $('<button/>', {class: 'tile'});
    this.$image = $('<img/>').appendTo(this.$button);
    this.$button.get()[0].tile = this;
    this.$image.attr('src', 'images/' + (id + 1) + '.png');
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
