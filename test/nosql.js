'use strict';

var assert  = require('assert');

var NoSQL  = require('../');
var nosql;

var setup = {
    ram: function (done) {
        //console.log('running set_up_ram');
        nosql = new NoSQL('test', { store: 'ram' }, done);
    },
    ssc: function (done) {
        nosql = new NoSQL('test', { store: 'ssc' }, done);
    },
    redis: function (done) {
        nosql = new NoSQL('test', { store: 'redis' }, function (err) {
            if (err) { console.error(err); }
            if (nosql && nosql.redis_pings) {
                return done();
            }
            console.log('failing back to memory for tests');
            nosql = new NoSQL('test', { store: 'ram' }, done);
        });
    }
};

['ram','ssc','redis'].forEach(function (store) {

    describe('nosql ' + store, function () {

        before(setup[store]);

        it('set', function (done) {
            nosql.set('foo', 'bar', function (err, result) {
                // console.log(arguments);
                assert.ifError(err);
                assert.ok(result < 2);
                done();
            });
        });

        it('get', function (done) {
            nosql.set('foo', 'bar', function (err, result) {
                assert.ifError(err);
                assert.ok(result < 2);

                nosql.get('foo', function (err2, result2) {
                    assert.ifError(err2);
                    assert.equal(result2, 'bar');
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
            nosql.del('foo', function (err, result) {
                assert.ifError(err);

                nosql.get('foo', function (err2, result2) {
                    assert.ifError(err2);
                    assert.equal(result2, null);
                    done();
                });
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
            nosql.set('foo', 1, function (err, res1) {
                assert.ifError(err);

                nosql.incrby('foo', 2, function (err2, res2) {
                    assert.ifError(err2);
                    assert.equal(res2, 3);

                    nosql.incrby('foo', 4, function (err3, res3) {
                        assert.ifError(err3);
                        assert.equal(res3, 7);
                        done();
                    });
                });
            });
        });

        it('incr, decrements', function (done) {
            nosql.set('foo', 1, function (err) {
                assert.ifError(err);

                nosql.incrby('foo', -1, function (err2, res1) {
                    assert.ifError(err2);
                    assert.equal(res1, 0);

                    nosql.incrby('foo', -2, function (err3, res2) {
                        assert.ifError(err3);
                        assert.equal(res2, -2);
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

        if (store !== 'ssc') {
            // Strong Store Cluster doesn't have a reset option
            it('get is empty after reset', function (done) {
                nosql.set('foo', 'bar', function (err, res1) {
                    nosql.reset(function (err2, res2) {
                        nosql.get('foo', function (err3, res3) {
                            // console.log(arguments);
                            assert.ifError(err3);
                            assert.equal(res3, null);
                            done();
                        });
                    });
                });
            });
        }
    });
});
