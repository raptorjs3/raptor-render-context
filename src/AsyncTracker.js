var AsyncWriter = require('./AsyncWriter');

function AsyncTracker(originalWriter) {
    this.originalWriter = originalWriter;
    this.remaining = 0;
    this.last = 0;
    this.ended = false;
    this.finished = false;
    this.ids = 0;
}

AsyncTracker.prototype = {
    begin(newWriter, parentWriter, options) {
        var timeout;
        var name;

        this.remaining++;

        if (options != null) {
            if (typeof options === 'number') {
                timeout = options;
            } else {
                timeout = options.timeout;

                if (options.last === true) {
                    if (timeout == null) {
                        // Don't assign a timeout to last flush fragments
                        // unless it is explicitly given a timeout
                        timeout = 0;
                    }

                    this.last++;
                }

                name = options.name;
            }
        }

        if (timeout == null) {
            timeout = AsyncWriter.DEFAULT_TIMEOUT;
        }

        newWriter.stack = AsyncWriter.INCLUDE_STACK ? new Error().stack : null;
        newWriter.name = name;

        if (timeout > 0) {
            newWriter._timeoutId = setTimeout(function() {
                newWriter.error(new Error('Async fragment ' + (name ? '(' + name + ') ': '') + 'timed out after ' + timeout + 'ms'));
            }, timeout);
        }

        this.originalWriter.emit('beginAsync', {
            writer: newWriter,
            parentWriter: parentWriter
        });
    },

    end: function(asyncWriter) {
        if (this.finished) {
            return;
        }

        var remaining;

        if (asyncWriter === this.originalWriter) {
            remaining = this.remaining;
            this.ended = true;
        } else {
            var timeoutId = asyncWriter._timeoutId;

            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            remaining = --this.remaining;
        }

        if (this.ended) {
            if (!this.lastFired && (this.remaining - this.last === 0)) {
                this.lastFired = true;
                this.last = 0;
                this.originalWriter.emit('last');
            }

            if (remaining === 0) {
                this.finished = true;
                if (this.originalWriter._originalWriter.end) {
                    this.originalWriter._originalWriter.end();
                } else {
                    this.originalWriter.emit('finish');
                }
            }
        }
    },
}


module.exports = AsyncTracker;