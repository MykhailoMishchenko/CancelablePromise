class CancelablePromise {
    constructor(executor) {
        if (typeof executor !== 'function') {
            throw new Error('Executor must be a function');
        }

        this.isCanceled = false;

        let externalResolve;
        let externalReject;

        const onCancel = () => {
            this.isCanceled = true;
            if (typeof externalReject === 'function') {
                externalReject({ isCanceled: true });
            }
        };

        this.promise = new Promise((resolve, reject) => {
            externalResolve = resolve;
            externalReject = reject;

            executor(resolve, reject, onCancel);
        });

        this.then = this.then.bind(this);
        this.catch = this.catch.bind(this);
        this.finally = this.finally.bind(this);
        this.cancel = this.cancel.bind(this);
    }

    then(onFulfilled, onRejected) {
        const cancelablePromise = new CancelablePromise(() => {});

        const newPromise = this.promise.then(
            value => {
                if (this.isCanceled) {
                    cancelablePromise.cancel();
                }
                if (typeof onFulfilled === 'function') {
                    return onFulfilled(value);
                }
                return value;
            },
            reason => {
                if (this.isCanceled) {
                    cancelablePromise.cancel();
                }
                if (typeof onRejected === 'function') {
                    return onRejected(reason);
                }
                throw reason;
            }
        );

        cancelablePromise.promise = newPromise;
        return cancelablePromise;
    }

    catch(onRejected) {
        return this.then(undefined, onRejected);
    }

    finally(onFinally) {
        return this.promise.finally(onFinally);
    }

    cancel() {
        if (!this.isCanceled) {
            this.isCanceled = true;
            if (typeof this.onCancel === 'function') {
                this.onCancel();
            }
        }
    }

    static resolve(value) {
        return new CancelablePromise(resolve => resolve(value));
    }

    static reject(reason) {
        return new CancelablePromise((resolve, reject) => reject(reason));
    }

    static all(iterable) {
        const promises = Array.from(iterable).map(p => CancelablePromise.resolve(p));

        return new CancelablePromise((resolve, reject, onCancel) => {
            onCancel(() => {
                promises.forEach(p => p.cancel());
            });

            Promise.all(promises.map(p => p.promise))
                .then(resolve)
                .catch(reject);
        });
    }

    static race(iterable) {
        const promises = Array.from(iterable).map(p => CancelablePromise.resolve(p));

        return new CancelablePromise((resolve, reject, onCancel) => {
            onCancel(() => {
                promises.forEach(p => p.cancel());
            });

            Promise.race(promises.map(p => p.promise))
                .then(resolve)
                .catch(reject);
        });
    }
}

module.exports = CancelablePromise;