import "common";

/**
 * Implemented behavior for moving by range step by step
 * @returns {Object}
 * @constructor
 */
function Processor() {
    var pause
        , stop
        , worker
        , tempTimeout
        ;

    var step = ONE_SECOND;

    var processor = {
        killWorker : killWorker
        , boundRange : [0, 1]
        , onFinished : null
        , onStopped : null
        , onStarted : null
        , onProcessing : null
        , onProcessed : null
        , onRecalc : null
        , onFilter : null
        , setting : {
            onCalcRightBound : null,
            skipEmptyDate : true
        }
    };

    // Initialize events functions
    d3.map(processor.setting).keys().forEach(function(key) {
        processor.setting[key] = func(processor.setting, key);
    });

    d3.map(processor).keys().forEach(function(key) {
        if (/^on/.test(key))
            processor[key] = func(processor, key);
    });

    function killWorker() {
        if (worker) {
            clearInterval(worker);
            worker = null;
        }

        if (tempTimeout) {
            clearTimeout(tempTimeout);
            tempTimeout = null;
        }
    }

    function doFunc(key) {
        return getFun(processor, key);
    }

    function doFilter(dl, dr) {
        return doFunc("onFilter")(dl, dr);
    }

    function doCalcRightBound (dl) {
        return getFun(processor.setting, "onCalcRightBound")(dl);
    }

    function doFinished(dl, dr) {
        doFunc("onFinished")(dl, dr);
    }

    function doStopped() {
        doFunc("onStopped")();
    }

    function doStarted() {
        doFunc("onStarted")();
    }

    function doProcessing(items, dl, dr) {
        doFunc("onProcessing")(items, dl, dr);
    }

    function doProcessed(items, dl, dr) {
        doFunc("onProcessed")(items, dl, dr);
    }

    function doRecalc(d) {
        doFunc("onRecalc")(d);
    }

    function loop() {

        if (tempTimeout) {
            clearTimeout(tempTimeout);
            tempTimeout = null;
        }

        if (stop) {
            killWorker();
            return;
        }

        if (pause)
            return;

        var dl, dr;

        dl = processor.boundRange[0];
        dr = doCalcRightBound(dl);
        processor.boundRange[0] = dr;

        var visTurn = doFilter(dl, dr);

        visTurn && visTurn.length && asyncForEach(visTurn, doRecalc, step / (visTurn.length || step));

        doProcessing(visTurn, dl, dr);

        try {
            if (dl > processor.boundRange[1]) {
                killWorker();
                doFinished(dl, dr);
                throw new Error("break");
            } else {
                if ((!visTurn || !visTurn.length) && processor.setting.skipEmptyDate) {
                    //loop();
                    tempTimeout = setTimeout(loop, 1);
                }
            }
        }
        catch (e) {
            //break;
        }
        finally {
            doProcessed(visTurn, dl, dr);
        }
    }

    processor.step = function(arg) {
        if (!arguments.length || arg === undefined || arg == null || arg < 0)
            return step;
        step = arg;

        if (processor.IsRun()) {
            killWorker();
            worker = setInterval(loop, step);
        }
        return processor;
    };


    processor.start = function() {
        stop = pause = false;
        killWorker();

        doStarted();

        worker = setInterval(loop, step);
        return processor;
    };

    processor.pause = function() {
        pause = true;
        return processor;
    };

    processor.stop = function() {
        stop = true;
        killWorker();
        doStopped();
        return processor;
    };

    processor.resume = function() {
        pause = false;
        return processor;
    };

    /**
     * Check that process is paused
     * @returns {boolean}
     */
    processor.IsPaused = function() {
        return worker && pause && !stop;
    };

    /**
     * Check that process is running
     * @returns {boolean}
     */
    processor.IsRun = function() {
        return !!worker;
    };

    return processor;
}