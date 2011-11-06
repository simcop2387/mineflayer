mf.include("a_star.js");
mf.include("arrays.js");

mf.hax.setGravityEnabled(false);

var navigator = {};
(function() {
    var monitor_interval = 100;
    var water_threshold = 0;
    /**
     * Finds a path to the specified location and goes there.
     * @param {Point} end Where you want to go.
     * @param {Object} params Optional parameters:
     *      is_end_func(node) - passed on to the a_star library. node.point is a mf.Point.
     *      end_radius - used for default is_end_func. effectively defaults to 0.
     *      timeout_milliseconds - passed on to the a_star library.
     *      path_part_found_func(path) - called when a partial path is found. path is an array of nodes.
     *      path_found_func(path) - called when a complete path is found. path is an array of nodes.
     *      cant_find_func() - called when a path can't be found.
     *      arrived_func() - called when the destination is reached.
     */
    navigator.navigateTo = function(end, params) {
        navigator.stop();
        var start = mf.self().position.floored();
        end = end.floored();
        if (params.timeout_milliseconds === undefined) {
            params.timeout_milliseconds = 10 * 1000;
        }
        if (start.distanceTo(end) > 150) {
            // Too far to calculate reliably. Go in the right general direction for now.
            var old_is_end_func = params.is_end_func;
            var old_path_found_func = params.path_found_func;
            var old_arrived_func = params.arrived_func;
            params.is_end_func = function(node) {
                // let's just go 100 meters (not end in water)
                return node.water === 0 && start.distanceTo(node.point) >= 100;
            };
            params.path_found_func = params.path_part_found_func;
            params.arrived_func = function() {
                // try to go the next bit
                params.is_end_func = old_is_end_func;
                params.path_found_func = old_path_found_func;
                params.arrived_func = old_arrived_func;
                navigator.navigateTo(end, params);
            };
        }
        if (params.is_end_func === undefined) {
            if (params.end_radius !== undefined) {
                params.is_end_func = function(node) {
                    return node.point.distanceTo(end) <= params.end_radius;
                };
            } else {
                params.is_end_func = function(node) {
                    return node.point.equals(end);
                };
            }
        }
        var path = a_star.findPath({
            "start": new Node(start, 0),
            "is_end_func": params.is_end_func,
            "neighbor_func": getNeighbors,
            "distance_func": function(node_a, node_b) { return 1; },
            "heuristic_func": function(node) { return node.point.distanceTo(end); },
            "timeout_milliseconds": params.timeout_milliseconds,
        });
        if (path === undefined) {
            if (params.cant_find_func !== undefined) {
                params.cant_find_func();
            }
            return;
        }
        if (params.path_found_func !== undefined) {
            params.path_found_func(path);
        }

        // start
        current_completed_callback = params.arrived_func;
        // go to the centers of blocks
        current_course = path.mapped(function(node) { return node.point.offset(0.5, 0, 0.5); });
        var last_node_time = new Date().getTime();
        function monitor_movement() {
            var next_point = current_course[0];
            var current_position = mf.self().position;
            if (current_position.distanceTo(next_point) <= 0.2) {
                // arrived at next point
                last_node_time = new Date().getTime();
                current_course.shift();
                if (current_course.length === 0) {
                    // done
                    navigator.stop();
                    if (current_completed_callback !== undefined) {
                        current_completed_callback();
                    }
                    return;
                }
                // not done yet
                next_point = current_course[0];
            }

            // snap to next point
            var look_at_point = new mf.Point(next_point.x, current_position.y, next_point.z);
            mf.lookAt(look_at_point);
            mf.hax.setPosition(next_point);

            // check for futility
            if (new Date().getTime() - last_node_time > 1500) {
                // should never take this long to go to the next node
                // reboot the path finding algorithm.
                navigator.navigateTo(end, params);
            }
        }
        current_callback_id = mf.setInterval(monitor_movement, monitor_interval);
    };
    navigator.stop = function() {
        if (current_callback_id === undefined) {
            return; // already stopped
        }
        mf.clearInterval(current_callback_id);
        current_callback_id = undefined;
        mf.clearControlStates();
    }

    function Node(point, water) {
        this.point = point;
        this.water = water;
    }
    Node.prototype.toString = function() {
        // must declare a toString so that a_star works.
        return this.point.toString() + ":" + this.water;
    };
    var current_callback_id;
    var current_completed_callback;
    var current_course = [];
    var direction_vectors = [];
    for (var x = -1; x <= 1; x++) {
        for (var y = -1; y <= 1; y++) {
            for (var z = -1; z <= 1; z++) {
                direction_vectors.push(new mf.Point(x, y, z));
            }
        }
    }
    var zero = direction_vectors.removeAt(13);
    function getNeighbors(node) {
        var point = node.point;
        var result = [];
        for (var i = 0; i < direction_vectors.length; i++) {
            var direction_vector = direction_vectors[i];
            var is_safe = function() {
                var min = direction_vector.min(zero);
                var max = direction_vector.max(zero);
                // include head room
                max = max.offset(0, 1, 0);
                var cursor = new mf.Point();
                for (cursor.x = min.x; cursor.x <= max.x; cursor.x++) {
                    for (cursor.y = min.y; cursor.y <= max.y; cursor.y++) {
                        for (cursor.z = min.z; cursor.z <= max.z; cursor.z++) {
                            if (!mf.isSafe(mf.blockAt(point.plus(cursor)).type)) {
                                return false;
                            }
                        }
                    }
                }
                return true;
            }();
            if (is_safe) {
                var neighbor = point.plus(direction_vector);
                result.push(neighbor);
            }
        }
        return result.mapped(function(point) {
            var face_block = mf.blockAt(point.offset(0, 1, 0));
            var water = 0;
            if (face_block.type === mf.ItemType.Water || face_block.type === mf.ItemType.StationaryWater) {
                water = node.water + 1;
            }
            return new Node(point, water);
        }).filtered(function(node) {
            return node.water <= water_threshold;
        });
    }
})();

