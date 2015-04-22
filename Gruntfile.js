module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-coveralls');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-version-check');

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            options: {
                jshintrc: true,
            },
            nosql: [ 'nosql.js' ],
            test: [ 'test/**/*.js' ],
            all: [ '<%= jshint.nosql %>', '<%= jshint.test %>' ],
        },
        mochaTest: {
            options: {
            },
            any: {
                src: ['test/**/*.js']
            }
        },
        clean: {
            dist: [ 'node_modules' ]
        },
        coveralls: {
            options: {
              // LCOV coverage file relevant to every target
              src: 'coverage-results/lcov.info',
              force: true
            },
            your_target: {
              // Target-specific LCOV coverage file
              src: 'coverage-results/extra-results-*.info'
            },
        },
        versioncheck: {
            options: {
              skip : ['semver', 'npm', 'lodash'],
              hideUpToDate : false
            }
        },
    });

    grunt.registerTask('default', ['jshint','mochaTest']);
};
