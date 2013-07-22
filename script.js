var Game = {
  init: function() {
    Game.init_window();
    Game.init_state();
    Game.init_level();
    Game.init_i18n();
    Game.init_clicks();
    Game.init_tiles();
    Game.init_timer();
    Game.init_score();
    Game.repaint();
  },
  init_window: function() {
    resize();
    $(window).resize(resize);
    function resize() {
      var w = $(window).width(), h = $(window).height(), size, r = 4 / 5;
      w > h ? set_wide_size() : set_narrow_size();
      set_font_size();
      function set_wide_size() {
        size = Math.min(w * r, h) * .99;
        $('#window').css({
          'width': size / r, 'height': size,
          'margin-top': (h - size) / 2
        });
        $('#window').removeClass('narrow');
        $('#window').addClass('wide');
      }
      function set_narrow_size() {
        size = Math.min(w, h * r) * .99;
        $('#window').css({
          'width': size, 'height': size / r,
          'margin-top': (h - size / r) / 2
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
    var gameover = true;
    Game.state = {win: win, lose: lose, gameover: is_over, display: display};

    $('#start-game').click(function() {
      start_game();
    });
    $('#end-game').click(function() {
      if (!Game.tiles.match_found() || window.confirm(i18n.t('are-you-sure')))
        end_game();
    });
    function start_game() {
      gameover = false;
      Game.tiles.reset();
      Game.clicks.reset();
      Game.score.reset();
      Game.timer.start();
      $('#window').removeClass('overlay');
      Game.repaint();
    }
    function end_game(win) {
      gameover = true;
      Game.timer.stop();
      Game.tiles.disable();
      if (arguments.length) {
        var params = {sprintf: [Game.score.value()]};
        alert(i18n.t(win ? 'you-win' : 'you-lose', params));
      }
      Game.repaint();
    }
    function win() {
      end_game(true);
    }
    function lose() {
      end_game(false);
    }
    function is_over() {
      return gameover;
    }
    function display() {
      $('#start-game').toggleClass('invisible', !gameover);
      $('#end-game').toggleClass('invisible', gameover);
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
      Game.score.reset();
      Game.timer.reset();
      Game.repaint();
    }
    function get() {
      return level;
    }
    function display() {
      var $button = $('#level-up');
      Game.state.gameover() ? Utils.enable($button) : Utils.disable($button);
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
    Game.timer = {start: start, stop: stop, reset: reset, time: get_time};
    reset();

    function start() {
      reset();
      interval = setInterval(function() {
        set_time(time + 1);
        if (time >= max_time)
          Game.state.lose();
      }, 1000);
    }
    function stop() {
      clearInterval(interval);
    }
    function reset() {
      stop();
      max_time = Game.tiles.count() * 4;
      set_time(0);
    }
    function get_time() {
      return time;
    }
    function set_time(t) {
      time = t;
      $('#seconds-left').text(max_time - time);
    }
  },
  init_clicks: function() {
    var count = 0, $tiles = $('#tiles'), tile_to_match;
    Game.clicks = {reset: reset, value: get};

    reset();
    $tiles.on('click', '.tile', function() {
      click(this.tile);
    });
    function get() {
      return count;
    }
    function set(n) {
      count = n;
      $('#clicks').text(count);
    }
    function reset() {
      set(0);
    }
    function click(tile) {
      set(count + 1);
      count % 2 === 1 ? first_click() : second_click();
      function first_click() {
        hide();
        tile.show();
        tile_to_match = tile;
      }
      function second_click() {
        tile.show();
        if (tile.id === tile_to_match.id)
          Game.tiles.match(tile_to_match, tile);
        else
          hide(tile_to_match, tile);
      }
      function hide(first_tile, second_tile) {
        var timeout;
        if (arguments.length) {
          $tiles.on('hide', function() {
            first_tile.display();
            second_tile.display();
            clearTimeout(timeout);
            $tiles.off('hide');
          });
          timeout = setTimeout(hide, 300);
        }
        else {
          $tiles.trigger('hide');
        }
      }
    }
  },
  init_tiles: function() {
    var tiles, $tiles = $('#tiles'), count, matches = 0;
    Game.tiles = {load: load, match: match, match_found: match_found,
      reset: reset, count: get_count, disable: disable, display: display};

    load();

    function match_found() {
      return matches > 0;
    }
    function match(tile1, tile2) {
      matches++;
      Game.score.update();
      tile1.matched = tile2.matched = true;
      if (matches === count / 2)
        Game.state.win();
    }
    function load() {
      var level = Game.level.value();
      count = Math.pow(level, 2) - (level % 2);

      tiles = [];
      $tiles.empty();
      for (var i = 0; i < count; i++) {
        tiles[i] = new Tile(i % (count / 2));
        tiles[i].$button.appendTo($tiles);
      }

      var tile_size = (100 / level) + '%';
      $('.tile').css({'width': tile_size, 'height': tile_size});
    }
    function reset() {
      for (var i = 0; i < tiles.length; i++)
        tiles[i].reset();
      shuffle();
      matches = 0;
    }
    function shuffle() {
      for (var i = 0; i < count; i++) {
        var $tile1 = $('.tile').eq(i);
        var $tile2 = $('.tile').eq(Math.floor(Math.random() * count));
        $tile1.after($tile2);
      }
    }
    function get_count() {
      return count;
    }
    function display() {
      for (var i = 0; i < tiles.length; i++)
        tiles[i].display();
      if (Game.state.gameover())
        disable();
    }
    function disable() {
      for (var i = 0; i < tiles.length; i++)
        tiles[i].disable();
    }
  },
  init_score: function() {
    var last_match_time, last_match_clicks, score;
    Game.score = {reset: reset, update: update, value: get};
    reset();

    function reset() {
      last_match_time = 0;
      last_match_clicks = 0;
      set(0);
    }
    function update() {
      var time = Game.timer.time() - last_match_time;
      var clicks = Game.clicks.value() - last_match_clicks;
      add(Game.tiles.count() * 20 / (time * clicks + 1));
      last_match_time = Game.timer.time();
      last_match_clicks = Game.clicks.value();
    }
    function add(n) {
      set(score + Math.round(n));
    }
    function set(n) {
      score = n;
      $('#score').text(score);
    }
    function get() {
      return score;
    }
  },
  repaint: function() {
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
    Utils.enable(this.$button);
  },
  display: function() {
    this.matched ? this.show() : this.hide();
  },
  disable: function() {
    Utils.disable(this.$button);
  }
});

var Utils = {
  enable: function($button) {
    $button.removeAttr('disabled');
  },
  disable: function($button) {
    $button.attr('disabled', 'disabled');
  }
};

$(function() {
  Game.init();
});
