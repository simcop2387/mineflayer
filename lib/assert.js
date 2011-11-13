var assert = {};
(function() {
    assert.isTrue = function(value) {
        if (value !== true) {
            throw new Error("AssertionError");
        }
    };
    function make_type_checker(type_name) {
        return function(value) {
            assert.isTrue(typeof value === type_name);
        };
    }
    assert.isBoolean = make_type_checker("boolean");
    assert.isNumber = make_type_checker("number");
    assert.isString = make_type_checker("string");
    assert.isFunction = make_type_checker("function");
    assert.isObject = make_type_checker("object");
    assert.keyIsInObject = function(key, object) {
        for (var k in object) {
            if (k == key) {
                return;
            }
        }
        throw new Error("AssertionError");
    };
    assert.valueIsInObject = function(value, object) {
        for (var key in object) {
            if (object[key] === value) {
                return;
            }
        }
        throw new Error("AssertionError");
    };
    assert.classIs = function(object, constructor) {
        assert.isTrue(object.constructor === constructor);
    };
    function make_class_checker(constructor) {
        return function(value) {
            assert.classIs(value, constructor);
        };
    }
    assert.isArray = make_class_checker(Array);
})();
