import Ember from 'ember';

export default Ember.Controller.extend({
    needs: ['application'],
    queryParams: ['days'],
    days: null,
    isFixedDaysFilter: false,
    isBiggerMargin: Ember.computed.alias('isFixedDaysFilter'),
    loadingCounter: undefined,
    isLoading: true,

    init: function() {
        this._super();
        this.set('loadingCounter', 0);
    },

    projectNameChanged: function() {
        this.set('controllers.application.activeProject', this.get('model.projectName'));
    }.observes('model.projectName'),

    actions: {
        daysChanged: function() {
            this.set('days', this.get('daysCounter'));
            this.set('loadingCounter', 0);
        }
    },

    /**
     * We use a loading counter property to notify if all resources were loaded
     * so wecan visually mark the data fresh (i.e. hide the laoding wheels)
     */
    loadingCounterChanged: function() {
        // Magic 4 is because we make 4 separate requests and we increment
        // the loadingCounter property each time a request is resolved
        this.set('isLoading', this.get('loadingCounter') < 4);
    }.observes('loadingCounter'),

    contentChanged: function() {
        // Prepare model for Summary
        this.set('daysCounter', this.get('content.days'));
        this.get('content.summary').then(function(res) {
            var metrics = res.report.metrics;
            this.set('repoSummary', Ember.Object.create({
                commits: metrics.commits,
                authors: metrics.authors,
                size: metrics.size,
                files: metrics.files
            }));
            this.incrementProperty('loadingCounter');
        }.bind(this));

        // Prepare model for Top Acievers
        this.get('content.topAchievers').then(function(res) {
            var metrics = res.report.metrics;

            this.set('topAchievers', Ember.keys(metrics).reduce(function(prev, curr) {
                var newCategory = {};
                newCategory[curr] = { winner: metrics[curr][1], value: metrics[curr][0]};

                return Ember.merge(prev, newCategory);
            }, Ember.Object.create()));
            this.incrementProperty('loadingCounter');
        }.bind(this));

        // Prepare model for charts
        this.get('content.reports').then(function(res) {
            var dates = res.report.x;
            var metrics = res.report.metrics;

            this.set('reports', dates.map(function(date, idx) {
                return {
                    date: date,
                    commits: metrics.commits[idx],
                    files_a: metrics.files_a[idx],
                    files_r: metrics.files_r[idx],
                    files_c: metrics.files_c[idx],
                    lines_a: metrics.lines_a[idx],
                    lines_r: metrics.lines_r[idx],
                    size: metrics.size[idx]
                };
            }));
            this.incrementProperty('loadingCounter');
        }.bind(this));

        this.get('content.filesChanged').then(function(res) {
            this.set('filesChanged', res.report.metrics.sum);
            this.incrementProperty('loadingCounter');
        }.bind(this));
    }.observes('content'),

    linesTotals: function() {
        if (this.get('reports')) {
            return {
                added: this._sumFor('reports', 'lines_a'),
                deleted: this._sumFor('reports', 'lines_r')
            };
        } else {
            return { added: 0, deleted: 0 };
        }
    }.property('reports'),

    filesTotals: function() {
        if (this.get('reports')) {
            return {
                added: this._sumFor('reports', 'files_a'),
                deleted: this._sumFor('reports', 'files_r'),
                changed: this._sumFor('reports', 'files_c')
            };
        } else {
            return { added: 0, deleted: 0, changed: 0 };
        }
    }.property('reports'),

    commitsTotal: function() {
        if (this.get('reports')) {
            return this._sumFor('reports', 'commits');
        }
    }.property('reports'),

    sizeTotal: function() {
        if (this.get('reports')) {
            return this._sumFor('reports', 'size');
        }
    }.property('reports'),

    _sumFor: function(arrayProp, key) {
        return this.get(arrayProp).reduce(function(prev, curr) {
            return prev + curr[key];
        }, 0);
    }
});
