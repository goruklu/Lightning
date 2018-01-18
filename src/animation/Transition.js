/**
 * Copyright Metrological, 2017
 */
let Base = require('../core/Base');

let Utils = require('../core/Utils');
/*M¬*/let EventEmitter = require(Utils.isNode ? 'events' : '../browser/EventEmitter');/*¬M*/

class Transition extends EventEmitter {

    constructor(manager, settings, view, property) {
        super()

        this.manager = manager;

        this._settings = settings;



        this._view = view
        this._getter = View.getGetter(property)
        this._setter = View.getSetter(property)

        this._merger = settings.merger

        if (!this._merger) {
            if (view.isColorProperty(property)) {
                this._merger = StageUtils.mergeColors
            } else {
                this._merger = StageUtils.mergeNumbers
            }
        }

        this._startValue = this._getter(this._view);
        this._targetValue = this._startValue;

        this._p = 1;
        this._delayLeft = 0;
    }

    stop() {
        if (this.isActive()) {
            this._setter(this._view, this.targetValue);
            this._p = 1;
        }
    }

    reset(targetValue, p) {
        this._startValue = this._getter(this._view);
        this._targetValue = targetValue;
        this._p = p;

        if (p < 1) {
            this.checkActive();
        } else if (p === 1) {
            this._setter(this._view, targetValue);

            // Immediately invoke onFinish event.
            this.invokeListeners();
        }
    }

    start(targetValue) {
        this._startValue = this._getter(this._view);

        if (targetValue === this._startValue || !this._view.isAttached()) {
            this.reset(targetValue, 1);
        } else {
            this._targetValue = targetValue;
            this._p = 0;
            this._delayLeft = this._settings.delay;
            this.emit('start');
            this.checkActive();
        }
    }

    finish() {
        if (this._p < 1) {
            this._p = 1;

            this._setter(this._view, this.targetValue);

            this.invokeListeners();
        }
    }

    checkActive() {
        if (this.isActive()) {
            this.manager.addActive(this);
        }
    }

    isActive() {
        return (this._p < 1.0) && this._view.isAttached();
    }

    progress(dt) {
        if (this.p < 1) {
            if (this.delayLeft > 0) {
                this._delayLeft -= dt;

                if (this.delayLeft < 0) {
                    dt = -this.delayLeft;
                    this._delayLeft = 0;

                    this.emit('delayEnd');
                } else {
                    return;
                }
            }

            if (this._settings.duration == 0) {
                this._p = 1;
            } else {
                this._p += dt / this._settings.duration;
            }
            if (this._p >= 1) {
                // Finished!
                this._p = 1;
            }
        }

        this._setter(this._view, this.getDrawValue());

        this.invokeListeners();
    }

    invokeListeners() {
        if (this._view.isAttached()) {
            this.emit('progress', this.p);
            if (this.p === 1) {
                this.emit('finish');
            }
        }
    }

    setValuesDynamic(targetValue) {
        let t = this._settings.timingFunctionImpl(this.p);
        if (t === 1) {
            this._targetValue = targetValue;
        } else if (t === 0) {
            this._startValue = this._targetValue;
            this._targetValue = targetValue;
        } else {
            this._startValue = targetValue - ((targetValue - this._targetValue) / (1 - t));
            this._targetValue = targetValue;
        }
    }

    getDrawValue() {
        if (this.p >= 1) {
            return this.targetValue;
        } else {
            let v = this._settings._timingFunctionImpl(this.p);
            return this._merger(this.targetValue, this.startValue, v);
        }
    }

    skipDelay() {
        this._delayLeft = 0;
    }

    get startValue() {
        return this._startValue;
    }

    get targetValue() {
        return this._targetValue;
    }

    get p() {
        return this._p;
    }

    get delayLeft() {
        return this._delayLeft;
    }

    get view() {
        return this._view;
    }

    get settings() {
        return this._settings;
    }

    set settings(v) {
        this._settings = v;
    }

}

Transition.prototype.isTransition = true;

module.exports = Transition;

let StageUtils = require('../core/StageUtils');
/*M¬*/let View = require('../core/View');/*¬M*/