'use strict';

var assert = require('assert');

var nosql  = require('../nosql');

var setup = {
    ram: function (done) {
        //console.log('running set_up_ram');
        nosql.cfg.store = 'ram';
        delete nosql.redis;
        nosql.init(function () {
            nosql.isCluster = false;
            done();
        });
    },
    ssc: function (done) {
        // console.log('running set_up_ssc');
        nosql.cfg.backend = 'ssc';
        delete nosql.redis;
        nosql.init(function (err, connected) {
            done();
        });
    },
    redis: function (done) {
        // console.log('running set_up_redis');
        nosql.cfg.store = 'redis';
        nosql.init(function (err, connected) {
            if (nosql.redis_pings) {
                return done();
            }
            delete nosql.redis;
            console.log('failing back to memory for tests');
            nosql.cfg.store = 'ram';
            nosql.init(done);
        });
    }
};

['ram','ssc','redis'].forEach(function (store) {

    describe('nosql ' + store, function () {

        before(setup[store]);

        it('set', function (done) {
            nosql.set('foo', 'bar', function (err, result) {
                assert.ifError(err);
                assert.ok(result < 2);
                done();
            });
        });

        it('get', function (done) {
            nosql.set('foo', 'bar', function (err, result) {
                nosql.get('foo', function (err, result) {
                    assert.ifError(err);
                    assert.equal(result, 'bar');
                    done();
                });
            });
        });

        it('del', function (done) {
            nosql.del('foo', function (err, result) {
                // console.log(arguments);
                assert.ifError(err);
                assert.equal(result, 1);
                done();
            });
        });

        it('get is null after del', function (done) {
            nosql.get('foo', function (err, result) {
                // console.log(arguments);
                assert.ifError(err);
                assert.equal(result, null);
                done();
            });
        });

        it('incr, init to incr val', function (done) {
            nosql.incrby('foo', 1, function (err, result) {
                // console.log(arguments);
                assert.ifError(err);
                assert.equal(result, 1);
                done();
            });
        });

        it('incr, increments', function (done) {
            var self = this;
            nosql.set('foo', 1, function (err, result) {
                nosql.incrby('foo', 2, function (err, result) {
                    nosql.incrby('foo', 4, function (err, result) {
                        // console.log(arguments);
                        assert.ifError(err);
                        assert.equal(result, 7);
                        done();
                    });
                });
            });
        });

        it('incr, decrements', function (done) {
            var self = this;
            nosql.set('foo', 1, function (err, result) {
                nosql.incrby('foo', -1, function (err, result) {
                    nosql.incrby('foo', -2, function (err, result) {
                        // console.log(arguments);
                        assert.ifError(err);
                        assert.equal(result, -2);
                        done();
                    });
                });
            });
        });

        it('reset', function (done) {
            nosql.reset(function (err, result) {
                // console.log(arguments);
                assert.ifError(err);
                assert.equal(result, 1);
                done();
            });
        });

        it('get should be empty after reset', function (done) {
            var self = this;
            nosql.set('foo', 'bar', function (err, result) {
                nosql.reset(function (err, result) {
                    nosql.get('foo', function (err, result) {
                        // console.log(arguments);
                        assert.ifError(err);
                        assert.equal(result, null);
                        done();
                    });
                });
            });
        });
    });
});
