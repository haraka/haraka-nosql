'use strict'

const assert = require('node:assert')
const { after, before, describe, it } = require('node:test')

const NoSQL = require('../')
let nosql

const setup = {
  ram: (t, done) => {
    //console.log('running set_up_ram');
    nosql = new NoSQL('test', { store: 'ram' }, done)
  },
  ssc: (t, done) => {
    nosql = new NoSQL('test', { store: 'ssc' }, done)
  },
  redis: (t, done) => {
    nosql = new NoSQL('test', { store: 'redis' }, (err) => {
      if (err) {
        console.error(err)
      }
      if (nosql) return done()

      console.log('failing back to memory for tests')
      nosql = new NoSQL('test', { store: 'ram' }, done)
    })
  },
}

;['ram', 'ssc', 'redis'].forEach((store) => {
  describe(`nosql ${store}`, () => {
    before(setup[store])

    after(() => {
      nosql.shutdown()
    })

    it('set', (t, done) => {
      nosql.set('foo', 'bar', function (err, result) {
        // console.log(arguments);
        assert.ifError(err)
        assert.ok(result < 2)
        done()
      })
    })

    it('get', (t, done) => {
      nosql.set('foo', 'bar', function (err, result) {
        assert.ifError(err)
        assert.ok(result < 2)

        nosql.get('foo', function (err2, result2) {
          assert.ifError(err2)
          assert.equal(result2, 'bar')
          done()
        })
      })
    })

    it('del', (t, done) => {
      nosql.del('foo', function (err, result) {
        // console.log(arguments);
        assert.ifError(err)
        assert.equal(result, 1)
        done()
      })
    })

    it('get is null after del', (t, done) => {
      nosql.del('foo', function (err, result) {
        assert.ifError(err)

        nosql.get('foo', function (err2, result2) {
          assert.ifError(err2)
          assert.equal(result2, null)
          done()
        })
      })
    })

    it('incr, init to incr val', (t, done) => {
      nosql.incrby('foo', 1, function (err, result) {
        // console.log(arguments);
        assert.ifError(err)
        assert.equal(result, 1)
        done()
      })
    })

    it('incr, increments', (t, done) => {
      nosql.set('foo', 1, function (err, res1) {
        assert.ifError(err)

        nosql.incrby('foo', 2, function (err2, res2) {
          assert.ifError(err2)
          assert.equal(res2, 3)

          nosql.incrby('foo', 4, function (err3, res3) {
            assert.ifError(err3)
            assert.equal(res3, 7)
            done()
          })
        })
      })
    })

    it('incr, decrements', (t, done) => {
      nosql.set('foo', 1, function (err) {
        assert.ifError(err)

        nosql.incrby('foo', -1, function (err2, res1) {
          assert.ifError(err2)
          assert.equal(res1, 0)

          nosql.incrby('foo', -2, function (err3, res2) {
            assert.ifError(err3)
            assert.equal(res2, -2)
            done()
          })
        })
      })
    })

    it('reset', (t, done) => {
      nosql.reset(function (err, result) {
        // console.log(arguments);
        assert.ifError(err)
        assert.equal(result, 1)
        done()
      })
    })

    if (store !== 'ssc') {
      // Strong Store Cluster doesn't have a reset option
      it('get is empty after reset', (t, done) => {
        nosql.set('foo', 'bar', function (err, res1) {
          nosql.reset(function (err2, res2) {
            nosql.get('foo', function (err3, res3) {
              // console.log(arguments);
              assert.ifError(err3)
              assert.equal(res3, null)
              done()
            })
          })
        })
      })
    }
  })
})
