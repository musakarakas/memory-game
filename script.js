$(function() {
  var State, Tiles, Clicks, Score, Timer, View, Level;
  load_game();

  // return window.Game = {state: State, tiles: Tiles,
  //   clicks: Clicks, score: Score, timer: Timer, view: View, level: Level};

  function load_game() {
    load_window();
    load_state();
    load_level();
    load_i18n();
    load_clicks();
    load_tiles();
    load_timer();
    load_score();
    load_view();
  }
  function load_window() {
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
  }
  function load_state() {
    var gameover = true;
    State = {win: win, lose: lose, gameover: is_over,
      start_game: start_game, reset_game: reset_game, display: display};

    $('#start-game').click(function() {
      reset_game();
    });
    $('#end-game').click(function() {
      if (!Tiles.match_found() || window.confirm(i18n.t('are-you-sure')))
        end_game();
    });
    function reset_game() {
      Tiles.load();
      Clicks.reset();
      Score.reset();
      Timer.reset();
      View.repaint();
    }
    function start_game() {
      gameover = false;
      Tiles.reset();
      Clicks.reset();
      Score.reset();
      Timer.start();
      $('#window').removeClass('overlay');
      View.repaint();
    }
    function end_game(win) {
      gameover = true;
      Timer.stop();
      Tiles.disable();
      if (arguments.length) {
        var params = {sprintf: [Score.value()]};
        alert(i18n.t(win ? 'you-win' : 'you-lose', params));
      }
      View.repaint();
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
  }
  function load_level() {
    var level = 4;
    $('#level-up').click(next);

    Level = {display: display, next: next, value: get};

    function next() {
      level = (level - 2) % 6 + 3; // 4 -> 5 -> 6 -> 7 -> 8 -> 3 -> 4
      State.reset_game();
    }
    function get() {
      return level;
    }
    function display() {
      var $button = $('#level-up');

      if (State.gameover()) $button.removeAttr('disabled');
      else $button.attr('disabled', 'disabled');

      $('#level').text(level + ' x ' + level);
      var klass = level > 5 ? 'icon-th' : 'icon-th-large';
      $('#level-up i').removeClass().addClass(klass);
    }
  }
  function load_i18n() {
    set_language();
    $('#language').click(set_language);
    function set_language() {
      var lng = i18n.lng() === 'en' ? 'tr' : 'en';
      var options = {lng: lng, fallbackLng: 'en', postProcess: 'sprintf'};
      i18n.init(options, function() {
        $('body').i18n();
      });
    }
  }
  function load_timer() {
    var interval = null, time = 0, max_time = 0;
    Timer = {start: start, stop: stop, reset: reset, time: get_time};
    reset();

    function start() {
      reset();
      interval = setInterval(function() {
        set_time(time + 1);
        if (time >= max_time)
          State.lose();
      }, 1000);
    }
    function stop() {
      clearInterval(interval);
    }
    function reset() {
      stop();
      max_time = Tiles.count() * 4;
      set_time(0);
    }
    function get_time() {
      return time;
    }
    function set_time(t) {
      time = t;
      $('#seconds-left').text(max_time - time);
    }
  }
  function load_clicks() {
    var count = 0, $tiles = $('#tiles'), tile_to_match;
    Clicks = {reset: reset, value: get};

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
      if (tile.matched) return;
      if (!tile.enabled) {
        var index = tile.$div.index();
        State.start_game();
        $($('.tile').get(index)).trigger('click');
        return;
      }
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
          Tiles.match(tile_to_match, tile);
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
  }
  function load_tiles() {
    var Tile = defineTileClass();
    var tiles, $tiles = $('#tiles'), count, matches = 0;
    Tiles = {load: load, match: match, match_found: match_found,
      reset: reset, count: get_count, disable: disable, display: display};

    load();

    function match_found() {
      return matches > 0;
    }
    function match(tile1, tile2) {
      matches++;
      Score.update();
      tile1.matched = tile2.matched = true;
      if (matches === count / 2)
        State.win();
    }
    function load() {
      var level = Level.value();
      count = Math.pow(level, 2) - (level % 2);

      tiles = [];
      $tiles.empty();
      for (var i = 0; i < count; i++) {
        tiles[i] = new Tile(i % (count / 2));
        tiles[i].$div.appendTo($tiles);
      }

      var tile_size = (100 / level - .4) + '%';
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
      if (State.gameover())
        disable();
    }
    function disable() {
      for (var i = 0; i < tiles.length; i++)
        tiles[i].disable();
    }

    function defineTileClass() {
      var Tile = function(id) {
        this.init(id);
      };

      Tile.prototype = {
        init: function(id) {
          this.id = id;
          this.$div = $('<div/>', {class: 'tile'});
          this.$image = $('<img/>').appendTo(this.$div);
          this.$div.get()[0].tile = this;
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
          this.$div.addClass('visible');
          this.disable();
        },
        hide: function() {
          this.$image.hide();
          this.$div.removeClass('visible');
          this.enable();
        },
        display: function() {
          this.matched ? this.show() : this.hide();
        },
        enable: function() {
          this.enabled = true;
          this.$div.addClass('enabled');
        },
        disable: function() {
          this.enabled = false;
          this.$div.removeClass('enabled');
        }
      };

      return Tile;
    }
  }
  function load_score() {
    var last_match_time, last_match_clicks, score;
    Score = {reset: reset, update: update, value: get};
    reset();

    function reset() {
      last_match_time = now();
      last_match_clicks = 0;
      set(0);
    }
    function update() {
      var time = now() - last_match_time;
      var clicks = Clicks.value() - last_match_clicks;
      add(Tiles.count() * 20000 / (time + 1) / (clicks + 1));
      last_match_time = now();
      last_match_clicks = Clicks.value();
    }
    function now() {
      return +new Date;
    }
    function add(n) {
      set(score + n);
    }
    function set(n) {
      score = n;
      $('#score').text(get());
    }
    function get() {
      return Math.round(score);
    }
  }
  function load_view() {
    View = {repaint: repaint};
    repaint();

    function repaint() {
      Level.display();
      State.display();
      Tiles.display();
    }
  }
});
