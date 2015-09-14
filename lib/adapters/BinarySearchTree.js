'use strict';

var AVLTree = require('binary-search-tree').AVLTree;
var FDBKeyRange = require('../FDBKeyRange');
var cmp = require('../cmp');

function keyRangeToBounds(keyRange) {
    var bounds = {};
    if (keyRange.lower !== undefined && keyRange.lowerOpen) {
        bounds.$gt = {key: keyRange.lower};
    } else if (keyRange.lower !== undefined) {
        bounds.$gte = {key: keyRange.lower};
    }

    if (keyRange.upper !== undefined && keyRange.upperOpen) {
        bounds.$lt = {key: keyRange.upper};
    } else if (keyRange.upper !== undefined) {
        bounds.$lte = {key: keyRange.upper};
    }

    return bounds;
}

function RecordStore(options) {
    this.tree = new AVLTree(options);
}

RecordStore.prototype.get = function (key) {
    if (key instanceof FDBKeyRange) {
        var bounds = keyRangeToBounds(key);
        return this.tree.betweenBounds(bounds)[0];
    }

    return this.tree.search({key: key})[0];
};

RecordStore.prototype.getAll = function (key) {
    if (key === undefined) {
        return this.records;
    }

    if (key instanceof FDBKeyRange) {
        return this.records.filter(function (record) {
            return FDBKeyRange.check(key, record.key);
        });
    }

    return this.records.filter(function (record) {
        return cmp(record.key, key) === 0;
    });
};

RecordStore.prototype.add = function (newRecord) {
    this.tree.insert(newRecord, newRecord);
};

RecordStore.prototype.delete = function (range) {
    var deletedRecords = [];

    this.records = this.records.filter(function (record) {
        var shouldDelete = FDBKeyRange.check(range, record.key);

        if (shouldDelete) {
            deletedRecords.push(record);
        }

        return !shouldDelete;
    });

    return deletedRecords;
};

RecordStore.prototype.clear = function () {
    var deletedRecords = this.records;

    this.records = [];

    return deletedRecords;
};

// Finds the first record within range where f returns true. Direction is either forward from lower bound ("next") or backwards from upper bound ("prev")
RecordStore.prototype.find = function (range, direction, f) {
    // The filters only makes things slower in this adapter, but it is here to ensure that `range` is actually properly defined, because other adapters will use it.
    var filteredRecords = this.records.filter(function (record) {
        return FDBKeyRange.check(range, record.key);
    });

    if (direction === "prev") {
        // Like filteredRecords.find(f) but in reverse
        for (var i = filteredRecords.length - 1; i >= 0; i--) {
            if (f(filteredRecords[i])) {
                return filteredRecords[i];
            }
        }
    }

    return filteredRecords.find(f);
};

module.exports = RecordStore;