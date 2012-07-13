(function($) {
    // frequency of A4
    var NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F',
                 'F#', 'G', 'G#', 'A', 'A#', 'B'],
        BUFFER_SIZE = 128,
        DEFAULT_A4 = 440;
        _ctx = new webkitAudioContext();

    /**
     * Wavefactory. Contains the wave function and amplitude function
     */
    WaveFactory = function(wf, af, sf, A4) {
        this.amplitudeFunction =
            (typeof(af) == 'function') ? af : (function (x) {
                return 0.5;
            });

        this.waveFunction =
            (typeof(af) == 'function') ? wf : (function (x) {
                return Math.sin(x * 2 * Math.PI);
            });

        this.silenceFunction =
            (typeof(af) == 'function') ? wf : (function (x) {
                return Math.exp(-x / 40);
            });
        this.A4 = A4 || DEFAULT_A4;
    }

    WaveFactory.prototype.getNote = function (octave, note) {
        var offset = (octave - 4) * 12 + NOTES.indexOf(note),
            freq = Math.pow(2, offset / 12) * this.A4;

        return new Note(freq, this);
    }

    /**
     * Wavefactory. A note
     */
    Note = function(context, frequency, waveFactory) {
        var self = this;
        this.x = 0;

        if (typeof(context) == 'number') {
            waveFactory = frequency;
            frequency = context;
            context = undefined;
        }

        this.context = context || _ctx;
        this.sample_rate = this.context.sampleRate;
        this.soundNode = this.context.createJavaScriptNode(BUFFER_SIZE, 1, 1);
        this.frequency = frequency;

        // we do this so that we can use "this" in the processor
        this.soundNode.onaudioprocess = function (e) { self.processor(e); };
        this.waveFactory = waveFactory || new WaveFactory;
    }

    Note.prototype.processor = function(e) {
        var right = e.outputBuffer.getChannelData(0),
            left  = e.outputBuffer.getChannelData(1);

        for(i=0; i <= right.length; i++) {
            right[i] = left[i] = this.waveFactory.amplitudeFunction(this.x) *
                                 this.waveFactory.waveFunction(this.x);
            this.x += this.frequency / this.sample_rate;
            //if (this.x > 1.0) this.x -= 1;
        }
    }

    Note.prototype.play = function () {
        this.x = 0;
        this.soundNode.connect(this.context.destination);
    }

    Note.prototype.silence = function () {
        this.silenceNote = true;
        this.soundNode.disconnect();
    }

    /*
     * Keyset. A set of keys that play consecutive notes
     */
    Keyset = function(waveFactory, octave, start, length) {
            // css classes
        var keyclasses = ['black', 'c', 'd', 'e'],
            classseq  = [1, 0, 2, 0, 3, 1, 0, 2, 0, 2, 0, 3],
            keys = $('<span class="keyset"></span>');

        switch (typeof(start)) {
        case 'undefined':
            start = 0;
            break;
        case 'string':
            start = NOTES.indexOf(start);
            start = (start >= 0)? start : start.parseInt();
            break;
        }

        length = length || NOTES.length;
        
        octave = octave || 4;

        for (i=0; i < length; i++) {
            var idx = (i + start) % NOTES.length,
                key = $('<div class="key key-' + keyclasses[classseq[idx]] + '"></div>');

            key.data('note', NOTES[idx]);
            key.attr('title', NOTES[idx]);
            key.data('octave', octave + Math.floor((i + start) / NOTES.length));

            keys.append(key);
        }

        var $last = keys.children().last();
        if (!$last.hasClass('key-black')) {
            $last.attr('class', 'key key-last');
        }

        this.waveFactory = waveFactory || new WaveFactory();

        this.$keys = keys;
        var self = this;
        this.$keys.find(".key").each(function () {
            var keyname = $(this).data('note'),
                octave = $(this).data('octave'),
                note = self.waveFactory.getNote(octave, keyname);

            $(this).bind('mousedown', function () {
                $(this).addClass('pressed');
                note.play();
                //self.keyDown(this);
            });

            $(this).bind('mouseup', function () {
                $(this).removeClass('pressed');
                note.silence();
                //self.keyUp(this);
            });
        });
    }

    // the defaults.
    $(document).ready(function () {
    });

    window.WaveFactory = WaveFactory;
    window.Note = Note;
    window.Keyset = Keyset;

})(Zepto);
