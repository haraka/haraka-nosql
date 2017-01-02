'use strict';
// nosql - static API for RAM, SSC, or Redis key-value store

if (process.env.NOSQL_COVERAGE) require('blanket');

function NoSQL (collection, options, done) {
    this.collection = collection || 'default';
    if (!options) options = {};

    // ram, ssc (strong store cluster), redis
    this.store      = options.store   || 'ram';
    this.default_cb = options.done    || function (ignore) {};
    this.expire     = 10 * 60;  // convert minutes to seconds
    this.ramCache   = {};
    this.cfg        = {};

    if (options.expire !== undefined) {
        this.expire = parseFloat(options.expire) * 60; // min to sec
    }

    switch (this.store) {
        case 'ram':
            if (this.expire) {
                this._interval = setInterval(this.reset, this.expire * 1000);
            }
            if (done) done();
            break;

        case 'ssc':    // Strong-Store-Cluster
            try {
                this.ssc = require('strong-store-cluster')
                                .collection(this.collection);
                if (this.expire) {
                    this.ssc.configure({ expireKeys: this.expire });
                }
                if (done) done(null, 1);
            }
            catch (e) {
                console.error(e);
                console.log('cannot load strong-store-cluster' +
                        ' see README to understand consequences');
                this.store = 'ram';
                if (done) done('cannot load strong-store-cluster');
            }
            break;

        case 'redis':
            this.cfg.redis = options.redis || {
                host: 'localhost',
                port: 6379,
                dbid: 0,
            };
            if (this.expire) {
                this._interval = setInterval(this.reset, this.expire * 1000);
            }
            this.redis_connect(done || this.default_cb);
            break;
    }
}

NoSQL.prototype.get = function (key, done) {
    if (!done) done = this.default_cb;

    switch (this.store) {
        case 'ram':
            done(null, this.ramCache[key]);
            break;

        case 'ssc':
            this.ssc.acquire(key, function (err, keylock, value) {
                if (err) { console.error(err); }
                keylock.release();
                done(err, value);
            });
            break;

        case 'redis':
            this.redis.hget(this.collection, key, done);
            break;
    }
};

NoSQL.prototype.set = function (key, val, done) {
    if (!done) done = this.default_cb;

    switch (this.store) {
        case 'ram':
            // mimic redis result
            var was_set = this.ramCache[key] ? 0 : 1;
            this.ramCache[key] = val;
            done(null, was_set);
            break;

        case 'ssc':
            // SSC saves JSON serialized, so put val into an object
            var newVal = val;
            this.ssc.acquire(key, function (err, keylock, oldVal) {
                if (err) { console.error(err); }
                keylock.set(newVal);
                keylock.release();
                done(err, oldVal ? 0 : 1);
            });
            break;

        case 'redis':
            this.redis.hset(this.collection, key, val, done);
            break;
    }
};

NoSQL.prototype.del = function (key, done) {
    if (!done) done = this.default_cb;

    switch (this.store) {
        case 'ram':
            delete this.ramCache[key];
            done(null, 1);
            break;

        case 'ssc':
            this.ssc.acquire(key, function (err, keylock, val) {
                if (err) { console.error(err); }
                keylock.del();
                keylock.release();
                done(err, 1);
            });

            break;

        case 'redis':
            this.redis.hdel(this.collection, key, done);
            break;
    }
};

NoSQL.prototype.incrby = function (key, incr, done) {
    if (!done) done = this.default_cb;
    incr = parseFloat(incr);

    switch (this.store) {
        case 'ram':
            if (isNaN(incr)) incr = 1;
            var val = parseFloat(this.ramCache[key]) || 0;
            if (isNaN(val)) val = 0;
            this.ramCache[key] = parseFloat(val) + incr;
            done(null, this.ramCache[key]);
            break;

        case 'ssc':
            if (isNaN(incr)) incr = 1;
            this.ssc.acquire(key, function (err, keylock, oldVal) {
                if (err) { console.error(err); }
                if (!oldVal) {
                    oldVal = 0;
                }
                else {
                    oldVal = parseFloat(oldVal);
                    if (isNaN(oldVal)) oldVal = 0;
                }
                keylock.set(oldVal + incr);
                keylock.release();
                done(err, oldVal + incr);
            });
            break;

        case 'redis':
            this.redis.hincrby(this.collection, key, incr, done);
            break;
    }
};

NoSQL.prototype.reset = function (done) {
    if (!done) done = this.default_cb;
    console.log('clearing ' + this.store);

    switch (this.store) {
        case 'ram':
            this.ramCache = {};
            done(null, 1);
            break;

        case 'ssc':
            // Strong Store Cluster has no such option
            done(null, 1);
            break;

        case 'redis':
            this.redis.del(this.collection, done);
            break;
    }
};

// Redis DB functions
NoSQL.prototype.redis_connect = function (done) {
    var nosql = this;
    var ranDone = 0;

    if (nosql.redis && nosql.redis_pings) {
        console.log('redis already connected');
        if (done) { ranDone++; done(null, true); }
        return;
    }

    var redis  = require('redis');   // npm module

    nosql.redis = redis.createClient(
        nosql.cfg.redis.port || 6379,
        nosql.cfg.redis.host || 'localhost'
    );

    nosql.redis.on('error', function (error) {
        // console.log('nosql redis error: ' + error.message);
        if (done && !ranDone) { ranDone++; done(error); }
    });

    nosql.redis.on('connect', function () {
        // console.log('redis connected');
        if (nosql.cfg.redis.dbid) {
            console.log('redis db ' + nosql.cfg.redis.dbid + ' selected');
            nosql.redis.select(nosql.cfg.redis.dbid);
        }
        ranDone++;
        nosql.redis_ping(done);
    });
};

NoSQL.prototype.redis_ping = function(done) {
    var nosql = this;

    var nope = function (err) {
        nosql.redis_pings=false;
        done(err, false);
    };

    if (!nosql.redis) { return nope('no redis!'); }

    nosql.redis.ping(function (err, res) {
        if (err           ) { return nope(err); }
        if (res !== 'PONG') { return nope('invalid redis response'); }
        nosql.redis_pings=true;
        done(null, true);
    });
};

module.exports = NoSQL;
