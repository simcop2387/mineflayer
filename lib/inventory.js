mf.include("items.js");
mf.include("assert.js");
var inventory = {};
(function() {
    inventory.slot_count = 36;
    inventory.column_count = 9;
    inventory.row_count = 4;

    inventory.InventoryType = {
        "Inventory": 0, // Accessed by mf.inventoryItem, mf.clickInventorySlot, any window open to access
        "Unique": 1, // Accessed by mf.uniqueWindowItem, mf.clickUniqueSlot, specified windowType open to access
        "ActionBar": 2 // Accessed by mf.inventoryItem, mf.clickInventorySlot, always viewable, any window open to click
    };

    inventory.getItemPredicate = function(item) {
        if (item === undefined) {
            return undefined;
        }
        if (typeof item === "number") {
            return function(it) { return it.type === item; };
        } else if (item.constructor === mf.Item) {
            return matching_func = function(it) { return it.type === item.type && it.metadata === item.metadata; };
        } else if (typeof item === "function") {
            return item;
        }
        return undefined;
    };

    /**
        A SlotArea is a consecutive group of slots that can be more intuitively interacted with.  The prototypes will provide a more universal interface to clicking on and viewing items.
    */

    /**
      * Constructor.
      * @param {mf.WindowType enum} _windowType What type of Window must be open for access. Undefined assumes it is always accessible.
      * @param {inventory.InventoryType enum} _inventoryType Determines how slots are accessed.
      * @param {Number} _slotStart The first slot in the consecutive list of slots.
      * @param {Number} _slotCount The number of slots in the consecutive list of slots.
      */
    inventory.SlotArea = function(_windowType, _inventoryType, _slotStart, _slotCount) {
        if (_windowType === undefined) {
            _windowType = mf.WindowType.None;
        }
        assert.valueIsInObject(_windowType, mf.WindowType);
        assert.valueIsInObject(_inventoryType, inventory.InventoryType);
        assert.isNumber(_slotStart);
        assert.isNumber(_slotCount);
        assert.isTrue(_slotStart > 0);
        assert.isTrue(_slotCount > 0);
        this.windowType = _windowType;
        this.inventoryType = _inventoryType;
        this.slotStart = _slotStart;
        this.length = _slotCount;
    };

    /**
      * Universal slot clicking access function
      * @param {Number in range[0, length)} slot The slot to click on.
      * @param {mf.MouseButton enum} mouseButton The mouse button to click with.
      */
    inventory.SlotArea.prototype.clickSlot = function(slot, mouseButton) {
        assert.isNumber(slot);
        assert.valueIsInObject(mouseButton, mf.MouseButton);
        if (slot < 0) {
            return undefined;
        }
        if (slot > this.length) {
            return;
        }
        assert.isTrue(mf.OpenWindow !== undefined);
        if (this.inventoryType === inventory.InventoryType.Unique) {
            if (mf.OpenWindow() !== this.windowType) {
                return;
            }
            mf.clickUniqueSlot(this.slotStart + slot, mouseButton);
        } else {
            if (mf.OpenWindow() !== mf.WindowType.None) {
                if (mf.InventorySlot(this.slotStart + slot) === undefined) {
                    return; // Out of range, most commonly because this is a single chest.
                }
                mf.clickInventorySlot(this.slotStart + slot, mouseButton);
            }
        }
    };

    /**
      * Universal slot item access function
      * @param {Number in range[0, length)} slot The slot to access.
      * @returns {mf.Item} The item in the slot.
      */
    inventory.SlotArea.prototype.itemInSlot = function(slot) {
        assert.isNumber(slot);
        if (slot < 0) {
            return undefined;
        }
        if (slot > this.length) {
            return undefined;
        }
        assert.isTrue(mf.OpenWindow !== undefined);
        if (this.inventoryType === inventory.InventoryType.Unique) {
            if (mf.OpenWindow() !== this.windowType) {
                return undefined;
            }
            return mf.uniqueWindowItem(this.slotStart + slot);
        } else if (this.inventoryType === inventory.InventoryType.Inventory) {
            if (mf.OpenWindow() === mf.WindowType.None && (this.slotStart + slot) > 8) {
                return undefined;
            }
            return mf.inventoryItem(this.slotStart + slot);
        } else {
            return mf.InventoryItem(this.slotStart + slot);
        }
    };

    inventory.Inventory = new inventory.SlotArea(mf.WindowType.Inventory, inventory.InventoryType.Inventory, 0, 36);
    inventory.ActionBar = new inventory.SlotArea(mf.WindowType.None, inventory.InventoryType.ActionBar, 0, 9);
    inventory.Chest = new inventory.SlotArea(mf.WindowType.Chest, inventory.InventoryType.Unique, 0, 54);
    inventory.Dispenser = new inventory.SlotArea(mf.WindowType.Dispenser, inventory.InventoryType.Unique, 0, 9);
    inventory.Workbench = new inventory.SlotArea(mf.WindowType.Workbench, inventory.InventoryType.Unique, 0, 10);
    inventory.Furnace = new inventory.SlotArea(mf.WindowType.Furnace, inventory.InventoryType.Unique, 0, 3);
    inventory.InventoryUnique = new inventory.SlotArea(mf.WindowType.Inventory, inventory.InventoryType.Unique, 0, 8);
    
    /**
      * Get a list of items that match a filter.
      * @param {function(mf.Item) -> bool} predicate_func The function to look for matches.
      * @returns {Array} All the matching mf.Item in the inventory.
      */
    inventory.SlotArea.prototype.filtered = function(predicate_func) {
        var result = [];
        for (var i = 0; i < this.length; i++) {
            var item = this.itemInSlot(i);
            if (predicate_func(item)) {
                result.push(item);
            }
        }
        return result;
    };

    /**
      * Get a list of items mapped through a transformation.
      * @param {function(mf.Item)} transformer_func The function that transforms all mf.Item in the inventory.
      * @returns {Array} The list of results of each item after transformation.
      */
    inventory.SlotArea.prototype.mapped = function(transformer_func) {
        var result = [];
        for (var i = 0; i < this.length; i++) {
            result.push(transformer_func(this.itemInSlot(i)));
        }
        return result;
    };

    /**
      * Find matching items in the inventory.
      * @param {Number OR mf.Item OR function(mf.Item) -> bool} item The match-making predicate.
      * @returns {Array} The list of slots for all matching items.
      */
    inventory.SlotArea.prototype.findItems = function(item) {
        var matching_func = inventory.getItemPredicate(item);
        if (matching_func === undefined) {
            return [];
        }
        var matches = [];
        for (var i = 0; i < this.length; i++) {
            var it = this.itemInSlot(i);
            if (it === undefined) {
                continue;
            }
            if (matching_func(this.itemInSlot(i))) {
                matches.push(i);
            }
        }
        return matches;
    };

    /**
      * Tries to equip (put in hand) the given item.
      * @param {Number OR mf.Item OR function(mf.Item) -> bool} item The match-making predicate.
      * @param {Function} A function to call if the equipping succeeds.
      */
    inventory.equipItem = function(item, callback) {
        var matching_func = inventory.getItemPredicate(item);
        if (matching_func === undefined) {
            return;
        }

        if (callback !== undefined) {
            assert.isFunction(callback);
        }

        var heldItem = mf.inventoryItem(mf.selectedEquipSlot());
        if (matching_func(heldItem)) {
            // Already holding the item
            if (callback !== undefined) {
                callback();
            }
            return;
        }
        var matches = inventory.ActionBar.findItems(matching_func);

        if (matches.length > 0) {
            // Item in Actionbar
            mf.selectEquipSlot(matches[0]);
            if (callback !== undefined) {
                callback();
            }
            return;
        }
        // Move Item to Action Bar and select it

    };

    /**
      * Counts how many of a certain type of item you have.
      * @param {Number OR mf.Item OR function(item) -> bool} item The item to match.
      * @returns {Number} the number of items in the SlotArea that match item.
      */

    inventory.SlotArea.prototype.itemCount = function(item) {
        var matching_func = inventory.getItemPredicate(item);
        if (item === undefined) {
            return 0;
        }

        var count = 0;
        for (var i = 0; i < this.length; i++) {
            var it = this.itemInSlot(i);
            if (it === undefined) {
                break; // Only known reasons for undefined indicate additionally evaluation is futile
            }
            if (matching_func(it)) {
                count += item.count;
            }
        }
        return count;
    };

    function equipSomeTool(block_type, callback, best) {
        var tools = items.toolsForBlock(block_type);
        if (tools === undefined) {
            return false;
        }
        if (tools === items.tools.swords) {
            // don't use swords
            return inventory.equipNonTool(callback);
        } else {
            // use a tool
            if (best) {
                tools = tools.reversed();
            }
            for (var i = 0; i < tools.length; i++) {
                if (inventory.equipItem(tools[i], callback)) {
                    return true;
                }
            }
            return false;
        }
    };
    inventory.equipWorstTool = function(block_type, callback) {
        return equipSomeTool(block_type, callback, false);
    };
    inventory.equipBestTool = function(block_type, callback) {
        return equipSomeTool(block_type, callback, true);
    };
    inventory.equipNonTool = function(callback) {
        for (var i = 0; i < inventory.InventoryFull.slotCount; i++) {
            var item_id = inventory.inventoryItem(i, inventory.InventoryFull).type;
            if (!items.isTool(item_id)) {
                return inventory.equipItem(item_id, callback);
            }
        }
        // really? our whole inventory is full of tools?
        return false;
    };

    /**
     * Gets the item you are holding.
     * @returns {Item} What you are now equipped with.
     */
    inventory.equippedItem = function() {
        return mf.inventoryItem(mf.selectedEquipSlot());
    };

    /**
     * Looks for armor in your inventory and equips it. If you don't
     * have the armor, nothing happens.
     * @param {Number} item_id The item ID of the armor you want to equip.
     */
    var slot_for_armor = {};
    slot_for_armor[mf.ItemType.LeatherHelmet] = 5;
    slot_for_armor[mf.ItemType.GoldHelmet] = 5;
    slot_for_armor[mf.ItemType.IronHelmet] = 5;
    slot_for_armor[mf.ItemType.DiamondHelmet] = 5;
    slot_for_armor[mf.ItemType.LeatherChestplate] = 6;
    slot_for_armor[mf.ItemType.GoldChestplate] = 6;
    slot_for_armor[mf.ItemType.IronChestplate] = 6;
    slot_for_armor[mf.ItemType.DiamondChestplate] = 6;
    slot_for_armor[mf.ItemType.LeatherLeggings] = 7;
    slot_for_armor[mf.ItemType.GoldLeggings] = 7;
    slot_for_armor[mf.ItemType.IronLeggings] = 7;
    slot_for_armor[mf.ItemType.DiamondLeggings] = 7;
    slot_for_armor[mf.ItemType.LeatherBoots] = 8;
    slot_for_armor[mf.ItemType.GoldBoots] = 8;
    slot_for_armor[mf.ItemType.IronBoots] = 8;
    slot_for_armor[mf.ItemType.DiamondBoots] = 8;

    var equipArmor_item_slot = undefined;

    inventory.equipArmor = function(item_id) {
        item_id = parseInt(item_id);
        if (slot_for_armor[item_id] === undefined) {
            return;
        }
        equipArmor_item_slot = inventory.itemSlot(item_id);
        if (equipArmor_item_slot !== undefined) {
            mf.openInventoryWindow();
        }
    };

    mf.onWindowOpened(function(window_type) {
        if (window_type !== mf.WindowType.Inventory) {
            return;
        }
        if (equipArmor_item_slot === undefined) {
            return;
        }
        var unique_slot = slot_for_armor[mf.inventoryItem(equipArmor_item_slot).type];
        mf.clickInventorySlot(equipArmor_item_slot,mf.MouseButton.Left);
        if (mf.uniqueWindowItem(unique_slot).type !== mf.ItemType.NoItem) {
            mf.clickUniqueSlot(unique_slot,mf.MouseButton.Left);
            mf.clickInventorySlot(equipArmor_item_slot,mf.MouseButton.Left);
        } else {
            mf.clickUniqueSlot(unique_slot,mf.MouseButton.Left);
        }
        equipArmor_item_slot = undefined;
    });

    inventory.isItemArmor = function(item_id) {
        return !(slot_for_armor[item_id] === undefined);
    };

   /**
     * Gives a snapshot containing the amounts of types of objects
     * @returns {Object} object that maps item type to
     *          total number in inventory
     */

    inventory.condensedSnapshot = function(inventory_type) {
        if (inventory_type === undefined) {
            inventory_type = inventory.InventoryFull;
        }
        var obj = {};
        for (var i = 0; i < inventory_type.slotCount; i++) {
            if (obj[inventory.inventoryItem(i,inventory_type).type] === undefined) {
                obj[inventory.inventoryItem(i,inventory_type).type] = inventory.inventoryItem(i,inventory_type).count;
            } else {
                obj[inventory.inventoryItem(i,inventory_type).type] += inventory.inventoryItem(i,inventory_type).count;
            }
        }
        delete obj[-1];
        return obj;
    };

    /**
     * Returns a snapshot of your inventory.
     * @returns [Array] items with properties:
     */

    inventory.snapshot = function(inventory_type) {
        if (inventory_type === undefined) {
            inventory_type = inventory.InventoryFull;
        }
        var obj = [];
        for (var i = 0; i < inventory_type.slotCount; i++) {
            if (inventory.inventoryItem(i,inventory_type).type !== undefined) {
                obj.push(inventory.inventoryItem(i,inventory_type));
            }
        }
        return obj;
    };

    inventory.getDatabase = function(inventory_type) {
        if (inventory_type === undefined) {
            inventory_type = inventory.InventoryFull;
        }
        var inventory_database = {};
        var current_inventory = inventory.snapshot(inventory_type);
        for (var i = 0; i < current_inventory.length; i++) {
            inventory_database[current_inventory[i].type] = items.nameForId(current_inventory[i].type);
        }
        return inventory_database;
    };

    /**
     * Tells how much room you have left in your inventory. No need to
     * worry about merging stacks; this function takes that into account.
     * @param {Number} item The item ID that you want to see how many more
     *                      will fit in your inventory.
     * @returns {Number} How many more of those items will fit.
     */
    inventory.spaceLeft = function(item_type, inventory_type) {
        if (inventory_type === undefined) {
            inventory_type = inventory.InventoryFull;
        }
        itemCount = 0;
        var current;
        for (var i = 0; i < inventory_type.slotCount; i++) {
            current = inventory.inventoryItem(i,inventory_type);
            if (current.type === item_type) {
                itemCount += Math.max(0,mf.itemStackHeight(item_type) - current.count);
            } else if (current.type === -1) {
                itemCount += mf.itemStackHeight(item_type);
            }
        }
        return itemCount;
    };

    /**
     * Tells how many free slots you have open in your inventory. No need
     * to worry about merging stacks; this function takes that into account.
     * @param {Object} inventory_type The optional type of inventory to look through
     * @returns {Number} The total number of empty inventory slots.
     */
    inventory.slotsLeft = function(inventory_type) {
        if (inventory_type === undefined) {
            inventory_type = inventory.InventoryFull;
        }
        itemCount = {};
        var current;
        for (var i = 0; i < inventory_type.slotCount; i++) {
            current = inventory.inventoryItem(i,inventory_type);
            if (itemCount.hasOwnProperty(current.type)) {
                itemCount[current.type] += Math.min(mf.itemStackHeight(current.type),current.count);
            } else if (current.type !== mf.ItemType.NoItem) {
                itemCount[current.type] = Math.min(mf.itemStackHeight(current.type),current.count);
            }
        }
        var remainingSlots = inventory_type.slotCount;
        for (var key in itemCount) {
            if (itemCount.hasOwnProperty(key)) {
                remainingSlots -= Math.ceil(itemCount[key] / mf.itemStackHeight(parseInt(key)));
            }
        }
        return remainingSlots;
    };

    inventory.itemsSlot = function(item_ids, inventory_type) {
        if (inventory_type === undefined) {
            inventory_type = inventory.InventoryFull;
        }
        for (var i = 0; i < inventory_type.slotCount; i++) {
            var item = inventory.inventoryItem(i,inventory_type);
            for (var j = 0; j < item_ids.length; j++) {
                var item_id = item_ids[j];
                if (item.type === item_id) {
                    return i;
                }
            }
        }
        return undefined;
    };

    /**
     * Returns the first slot that contains any number of item.
     */
    inventory.itemSlot = function(item_id, inventory_type) {
        if (inventory_type === undefined) {
            inventory_type = inventory.InventoryFull;
        }
        for (var i = 0; i < inventory_type.slotCount; i++) {
            var item = inventory.inventoryItem(i,inventory_type);
            if (item.type === item_id) {
                return i;
            }
        }
        return undefined;
    };

    /*
     * Returns the first slot that contains room for any of the specified types of items.
    */
    inventory.slotForItems = function(item_ids, inventory_type) {
        if (inventory_type === undefined) {
            inventory_type = inventory.InventoryFull;
        }
        for (var i = 0; i < inventory_type.slotCount; i++) {
            var item = inventory.inventoryItem(i,inventory_type);
            for (var j = 0; j < item_ids.length; j++) {
                var item_id = item_ids[j];
                if (item.type !== item_id && item.type !== mf.ItemType.NoItem) {
                    continue;
                }
                if (item.type === item_id && item.count >= mf.itemStackHeight(item.type)) {
                    continue;
                }
                return i;
            }
        }
        return undefined;
    };

    /*
     * Returns all of the slots with room for the specified types of items.  Unfilled stacks are always listed before empty slots.
    */
    inventory.slotsForItems = function(item_ids, inventory_type) {
        if (inventory_type === undefined) {
            inventory_type = inventory.InventoryFull;
        }
        var direct_matches = [];
        var empty_matches = [];
        for (var i = 0; i < inventory_type.slotCount; i++) {
            var item = inventory.inventoryItem(i,inventory_type);
            for (var j = 0; j < item_ids.length; j++) {
                var item_id = item_ids[j];
                if (item.type !== item_id && item.type !== mf.ItemType.NoItem) {
                    continue;
                }
                if (item.type === item_id && item.count >= mf.itemStackHeight(item.type)) {
                    continue;
                }
                if (item.type === item_id) {
                    direct_matches.push(i);
                } else {
                    empty_matches.push(i)
                }
            }
        }
        return direct_matches.concat(empty_matches);
    };

    /*
     * Returns the first slot that contains room for the specified type of item.
    */
    inventory.slotForItem = function(item_id, inventory_type) {
        if (inventory_type === undefined) {
            inventory_type = inventory.InventoryFull;
        }
        for (var i = 0; i < inventory_type.slotCount; i++) {
            var item = inventory.inventoryItem(i,inventory_type);
            if (item.type !== item_id && item.type !== mf.ItemType.NoItem) {
                continue;
            }
            if (item.type === item_id && item.count >= mf.itemStackHeight(item.type)) {
                continue;
            }
            return i;
        }
        return undefined;
    };

    /*
     * Returns all of the slots with room for the specified type of item.  Unfilled stacks are always listed before empty slots.
    */
    inventory.slotsForItem = function(item_id, inventory_type) {
        if (inventory_type === undefined) {
            inventory_type = inventory.InventoryFull;
        }
        var direct_matches = [];
        var empty_matches = [];
        for (var i = 0; i < inventory_type.slotCount; i++) {
            var item = inventory.inventoryItem(i,inventory_type);
            if (item.type !== item_id && item.type !== mf.ItemType.NoItem) {
                continue;
            }
            if (item.type === item_id && item.count >= mf.itemStackHeight(item.type)) {
                continue;
            }
            if (item.type === item_id) {
                direct_matches.push(i);
            } else {
                empty_matches.push(i)
            }
        }
        return direct_matches.concat(empty_matches);
    };

    /**
     * Returns the first empty slot, or undefined
     */
    inventory.firstEmptySlot = function(inventory_type) {
        return inventory.itemSlot(mf.ItemType.NoItem, inventory_type);
    };


    //Overriding the mf.closeWindow function.
    inventory.currentlyOpenWindow = undefined;
    var old_close_window = mf.closeWindow;
    mf.closeWindow = function() {
        old_close_window();
        inventory.selectedItem = undefined;
        inventory.currentlyOpenWindow = undefined;
    };

    mf.onWindowOpened(function(window_type) {
        inventory.currentlyOpenWindow = window_type;
    });

})();

//Overriding the mf.clickInventorySlot and mf.clickUniqueSlot functions

inventory.selectedItem = undefined;

var oldClickInventory = mf.clickInventorySlot;
var oldClickUnique = mf.clickUniqueSlot;

mf.clickInventorySlot = function(slot,mouseButton) {
    if (inventory.selectedItem === undefined) {
        if (mf.inventoryItem(slot).type === mf.ItemType.NoItem) {
            return;
        }
        inventory.selectedItem = mf.inventoryItem(slot);
        if (mouseButton === mf.MouseButton.Right) {
            inventory.selectedItem.count = Math.ceil(inventory.selectedItem.count/2);
        }
        oldClickInventory(slot,mouseButton);
    } else if (inventory.selectedItem.type !== mf.inventoryItem(slot).type) {
        if (mf.inventoryItem(slot).type === mf.ItemType.NoItem) {
            if (mouseButton === mf.MouseButton.Left) {
                inventory.selectedItem = undefined;
            } else {
                inventory.selectedItem = new mf.Item(inventory.selectedItem.type, inventory.selectedItem.count-1);
                if (inventory.selectedItem.count === 0) {
                    inventory.selectedItem = undefined;
                }
            }
        } else {
            inventory.selectedItem = mf.inventoryItem(slot);
        }
        oldClickInventory(slot,mouseButton);
    } else if (mouseButton === mf.MouseButton.Right) {
        if (mf.itemStackHeight(mf.inventoryItem(slot).type) - mf.inventoryItem(slot).count > 0) {
            inventory.selectedItem = new mf.Item(inventory.selectedItem.type, inventory.selectedItem.count-1);
            if (inventory.selectedItem.count === 0) {
                inventory.selectedItem = undefined;
            }
        }
        oldClickInventory(slot,mouseButton);
    } else if (mouseButton === mf.MouseButton.Left) {
        var slot_count = mf.itemStackHeight(mf.inventoryItem(slot).type) - mf.inventoryItem(slot).count;
        if (inventory.selectedItem.count <= slot_count) {
            inventory.selectedItem = undefined;
        } else {
            inventory.selectedItem = new mf.Item(inventory.selectedItem.type, inventory.selectedItem.count-slot_count);
        }
        oldClickInventory(slot,mouseButton);
    }
};

mf.clickUniqueSlot = function(slot,mouseButton) {
    if (inventory.selectedItem === undefined) {
        if (mf.uniqueWindowItem(slot).type === mf.ItemType.NoItem) {
            return;
        }
        inventory.selectedItem = mf.uniqueWindowItem(slot);
        if (mouseButton === mf.MouseButton.Right) {
            inventory.selectedItem = new mf.Item(inventory.selectedItem.type, Math.ceil(inventory.selectedItem.count/2));
        }
        oldClickUnique(slot,mouseButton);
    } else if (inventory.selectedItem.type !== mf.uniqueWindowItem(slot).type) {
        if (mf.uniqueWindowItem(slot).type === mf.ItemType.NoItem) {
            if (mouseButton === mf.MouseButton.Left) {
                inventory.selectedItem = undefined;
            } else {
                inventory.selectedItem = new mf.Item(inventory.selectedItem.type, inventory.selectedItem.count-1);
                if (inventory.selectedItem.count === 0) {
                    inventory.selectedItem = undefined;
                }
            }
        } else {
            inventory.selectedItem = mf.uniqueWindowItem(slot);
        }
        oldClickUnique(slot,mouseButton);
    } else if (mouseButton === mf.MouseButton.Right) {
        if (mf.itemStackHeight(mf.uniqueWindowItem(slot).type) - mf.uniqueWindowItem(slot).count > 0) {
            inventory.selectedItem = new mf.Item(inventory.selectedItem.type, inventory.selectedItem.count-1);
            if (inventory.selectedItem.count === 0) {
                inventory.selectedItem = undefined;
            }
        }
        oldClickUnique(slot,mouseButton);
    } else if (mouseButton === mf.MouseButton.Left) {
        var slot_count = mf.itemStackHeight(mf.uniqueWindowItem(slot).type) - mf.uniqueWindowItem(slot).count;
        if (inventory.selectedItem.count <= slot_count) {
            inventory.selectedItem = undefined;
        } else {
            inventory.selectedItem = new mf.Item(inventory.selectedItem.type, inventory.selectedItem.count-slot_count);
        }
        oldClickUnique(slot,mouseButton);
    }
};

inventory.isInventoryOpen = function(inv) {
    if (inventory.currentlyOpenWindow === undefined) {
        return false;
    }
    if (inv === undefined) {
        inv = inventory.InventoryFull;
    }
    if (inv.windowType !== mf.WindowType.Inventory && inventory.currentlyOpenWindow !== inv.windowType) {
        return false;
    }
    if (inv.windowType === mf.WindowType.Inventory && inv.itemInSlot === mf.uniqueWindowItem && inventory.currentlyOpenWindow !== inv.windowType) {
        return false;
    }
    return true;
};

inventory.moveSelected = function(inv_to) {
    if (inventory.selectedItem === undefined) {
        return true;
    }
    if (inv_to === undefined) {
        inv_to = inventory.InventoryFull;
    }
    if (! inventory.isInventoryOpen(inv_to)) {
        return false;
    }
    var slots = inventory.slotsForItem(inventory.selectedItem.type);
    for (var i = 0; i < slots.length; i++) {
        inventory.clickInventorySlot(slots[i],mf.MouseButton.Left,inv_to);
        if (inventory.selectedItem === undefined) {
            return true;
        }
    }
    return false;
};

inventory.moveCountType = function(item_count, item_type, inv_from, inv_to) {
    if (item_count === undefined) {
        return moveAllType(item_type, inv_from, inv_to);
    }
    if (item_type === undefined) {
        return moveAll(inv_from, inv_to);
    }
    if (inv_from === undefined) {
        inv_from = inventory.InventoryFull;
    }
    if (inv_to === undefined) {
        inv_to = inventory.InventoryFull;
    }
    if (inv_from === inv_to) {
        return true;
    }
    if (! inventory.isInventoryOpen(inv_from) || ! inventory.isInventoryOpen(inv_to)) {
        return false;
    }
    if (inventory.selectedItem !== undefined) {
        var success = moveSelected(inv_to);
        if (! success) {
            // Couldn't move selected item to inv_to, not going to try to move items from inv_from to inv_to.
            return success;
        }
    }
    for (var i = 0; i < inv_from.slotCount; i++) {
        if (item_count <= 0) {
            return true;
        }
        var item = inventory.inventoryItem(i,inv_from);
        if (item.type !== item_type) {
            continue;
        }
        if (item_count >= item.count) {
            inventory.clickInventorySlot(i,mf.MouseButton.Left,inv_from);
            var slots = inventory.slotsForItem(item_type, inv_to);
            for (var j = 0; j < slots.length; j++) {
                var slot = slots[j];
                if (inventory.selectedItem === undefined) {
                    break;
                }
                inventory.clickInventorySlot(slot,mf.MouseButton.Left, inv_to);
            }
            if (inventory.selectedItem !== undefined) {
                inventory.clickInventorySlot(i,mf.MouseButton.Left, inv_from);
                return false;
            }
            item_count -= item.count;
        } else {
            while (item_count >= Math.ceil(item.count/2)) {
                inventory.clickInventorySlot(i,mf.MouseButton.Right, inv_from);
                var slots = inventory.slotsForItem(item_type, inv_to);
                for (var j = 0; j < slots.length; j++) {
                    var slot = slots[j];
                    if (inventory.selectedItem === undefined) {
                        break;
                    }
                    inventory.clickInventorySlot(slot,mf.MouseButton.Left, inv_to);
                }
                if (inventory.selectedItem !== undefined) {
                    inventory.clickInventorySlot(i,mf.MouseButton.Left, inv_from);
                    return false;
                }
                item_count -= Math.ceil(item.count/2);
                item = inventory.inventoryItem(i,inv_from);
            }
            if (item_count > 0) {
                inventory.clickInventorySlot(i,mf.MouseButton.Right, inv_from);
                var slots = inventory.slotsForItem(item_type, inv_to);
                for (var j = 0; j < slots.length; j++) {
                    var slot = slots[j];
                    if (inventory.selectedItem === undefined) {
                        break;
                    }
                    var room = mf.itemStackHeight(item_type) - inventory.inventoryItem(slot,inv_to).count;
                    if (room <= item_count) {
                        inventory.clickInventorySlot(slot,mf.MouseButton.Left, inv_to);
                        item_count -= room;
                    } else {
                        for (var k = 0; k < item_count; k++) {
                            inventory.clickInventorySlot(slot, mf.MouseButton.Right, inv_to);
                        }
                        inventory.clickInventorySlot(i, mf.MouseButton.Left, inv_from);
                        return true;
                    }
                }
                if (inventory.selectedItem !== undefined) {
                    inventory.clickInventorySlot(i,mf.MouseButton.Left, inv_from);
                    return false;
                }
            } else {
                return true;
            }

        }
    }
    return true;
};

inventory.moveAllType = function(item_type, inv_from, inv_to) {
    if (item_type === undefined) {
        return moveAll(inv_from, inv_to);
    }
    if (inv_from === undefined) {
        inv_from = inventory.InventoryFull;
    }
    if (inv_to === undefined) {
        inv_to = inventory.InventoryFull;
    }
    if (inv_from === inv_to) {
        return true;
    }
    if (! inventory.isInventoryOpen(inv_from) || ! inventory.isInventoryOpen(inv_to)) {
        return false;
    }
    if (inventory.selectedItem !== undefined) {
        var success = moveSelected(inv_to);
        if (! success) {
            // Couldn't move selected item to inv_to, not going to try to move items from inv_from to inv_to.
            return success;
        }
    }
    for (var i = 0; i < inv_from.slotCount; i++) {
        var item = inventory.inventoryItem(i,inv_from);
        if (item.type !== item_type) {
            continue;
        }
        var slots = inventory.slotsForItem(item_type,inv_to);
        inventory.clickInventorySlot(i,mf.MouseButton.Left,inv_from);
        for (var j = 0; j < slots.length; j++) {
            var slot = slots[j];
            if (inventory.selectedItem === undefined) {
                break;
            }
            inventory.clickInventorySlot(slot,mf.MouseButton.Left, inv_to);
        }
        if (inventory.selectedItem !== undefined) {
            inventory.clickInventorySlot(i,mf.MouseButton.Left, inv_from);
            return false;
        }
    }
    return true;
};

inventory.moveAll = function(inv_from, inv_to) {
    if (inv_from === undefined) {
        inv_from = inventory.InventoryFull;
    }
    if (inv_to === undefined) {
        inv_to = inventory.InventoryFull;
    }
    if (inv_from === inv_to) {
        return true;
    }
    if (! inventory.isInventoryOpen(inv_from) || ! inventory.isInventoryOpen(inv_to)) {
        return false;
    }
    if (inventory.selectedItem !== undefined) {
        var success = moveSelected(inv_to);
        if (! success) {
            // Couldn't move selected item to inv_to, not going to try to move items from inv_from to inv_to.
            return success;
        }
    }
    var flag = true;
    for (var i = 0; i < inv_from.slotCount; i++) {
        var item = inventory.inventoryItem(i,inv_from);
        if (item.type === mf.ItemType.NoItem) {
            continue;
        }
        var slots = inventory.slotsForItem(item.type,inv_to);
        inventory.clickInventorySlot(i, mf.MouseButton.Left, inv_from);
        for (var j = 0; j < slots.length; j++) {
            var slot = slots[j];
            if (inventory.selectedItem === undefined) {
                break;
            }
            inventory.clickInventorySlot(slot,mf.MouseButton.Left, inv_to);
        }
        if (inventory.selectedItem !== undefined) {
            flag = false;
            inventory.clickInventorySlot(i,mf.MouseButton.Left, inv_from);
        }
    }
    return flag;
};
