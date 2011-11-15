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
            return function(it) { return it.type === item.type && it.metadata === item.metadata; };
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
        assert.isTrue(_slotStart >= 0);
        assert.isTrue(_slotCount > 0);
        this.windowType = _windowType;
        this.inventoryType = _inventoryType;
        this.slotStart = _slotStart;
        this.length = _slotCount;
    };

    /**
      * Determines if a SlotArea's contents can be clicked on (e.g. whether it is open).
      * @returns {Boolean} True iff the contents can be clicked on.
      */
    inventory.SlotArea.prototype.isClickable = function() {
        switch(this.inventoryType) {
            case inventory.InventoryType.Unique:
                return mf.openWindow() === this.windowType;
            case inventory.InventoryType.Inventory:
            case inventory.InventoryType.ActionBar:
                return mf.openWindow() !== mf.WindowType.None;
            default:
                return undefined;
        }
    };
    /**
      * Determins if a SlotArea's contents can be viewed.
      * @returns {Boolean} True iff the contents can be viewed.
      */
    inventory.SlotArea.prototype.isViewable = function() {
        switch(this.inventoryType) {
            case inventory.InventoryType.Inventory:
                return mf.openWindow() !== mf.WindowType.None;
            case inventory.InventoryType.Unique:
                return mf.openWindow() === this.windowType;
            case inventory.InventoryType.ActionBar:
                return true;
            default:
                return undefined;
        }
    };

    /**
      * Determines if a SlotArea's specified slot is valid (works for single chests!).
      * @param {Number} The slot to check.
      * @returns {Boolean} True iff the specified slot is within the SlotArea range, and is valid.
      */
    inventory.SlotArea.prototype.slotIsValid(slot) {
        if (slot >= this.length) {
            return false;
        }
        if (slot < 0) {
            return false;
        }
        if (this.inventoryType === inventory.InventoryType.Unique && ((this.slotStart + slot) >= mf.uniqueSlotCount())) {
            return false;
        }
        return true;
    };

    /**
      * Universal slot clicking access function
      * @param {Number in range[0, length)} slot The slot to click on.
      * @param {mf.MouseButton enum} mouseButton The mouse button to click with.
      */
    inventory.SlotArea.prototype.clickSlot = function(slot, mouseButton) {
        assert.isNumber(slot);
        assert.valueIsInObject(mouseButton, mf.MouseButton);
        if (! slotIsValid(slot)) {
            return;
        }
        if (! this.isClickable()) {
            return;
        }
        switch(this.inventoryType) {
            case inventory.InventoryType.Unique:
                mf.clickUniqueSlot(this.slotStart + slot, mouseButton);
            case inventory.InventoryType.Inventory:
            case inventory.InventoryType.ActionBar:
                mf.clickInventorySlot(this.slotStart + slot, mouseButton);
            default:
                return;
        }
    };

    /**
      * Universal slot item access function
      * @param {Number in range[0, length)} slot The slot to access.
      * @returns {mf.Item} The item in the slot.
      */
    inventory.SlotArea.prototype.itemInSlot = function(slot) {
        assert.isNumber(slot);
        if (! slotIsValid(slot)) {
            return undefined;
        }
        if (! this.isViewable()) {
            return undefined;
        }
        switch(this.inventoryType) {
            case inventory.InventoryType.Unique:
                return mf.uniqueWindowItem(this.slotStart + slot);
            case inventory.InventoryType.Inventory:
            case inventory.InventoryType.ActionBar:
                return mf.inventoryItem(this.slotStart + slot);
            default:
                return undefined;
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
            if (item === undefined) {
                break;
            }
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
            var item = this.itemInSlot(i);
            if (item === undefined) {
                break;
            }
            result.push(transformer_func(item));
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
                break;
            }
            if (matching_func(it)) {
                matches.push(i);
            }
        }
        return matches;
    };

    /*
     * Returns all of the slots with room for the specified type of item.  Unfilled stacks are always listed before empty slots.
     * @param {Number OR mf.Item OR funtion(mf.Item) -> bool} item The match-making predicate.
     * @returns {Array} A list of all slots with room for anything that matches item.
    */
    inventory.SlotArea.prototype.slotsForItem = function(item) {
        var matching_func = inventory.getItemPredicate(item);
        var direct_matches = [];
        var empty_matches = [];
        for (var i = 0; i < inventory_type.slotCount; i++) {
            var it = this.itemInSlot(i);
            if (it == undefined) {
                break;
            }
            if (it.type === mf.ItemType.NoItem) {
                empty_matches.push(i);
                continue;
            }
            if (! matching_func(it)) {
                continue;
            }
            if (it.count >= mf.itemStackHeight(it.type)) {
                continue;
            }
            direct_matches.push(i);
        }
        return direct_matches.concat(empty_matches);
    };

    /**
      * Tries to move all held items into the SlotArea.
      * @returns {Boolean} Whether it was able to move all of the held item.
      */
    inventory.SlotArea.moveHeld() {
        var held = mf.heldItem();
        if (held.type !== mf.ItemType.NoItem) {
            return true;
        }
        if (! this.isClickable()) {
            return false;
        }
        for (var i = 0; i < this.length; i++) {
            var item = this.itemInSlot(i);
            if (item === undefined) {
                continue;
            }
            if (item.type === mf.ItemType.NoItem) {
                this.clickSlot(i, mf.MouseButton.Left);
                return true;
            }
            if (! item.type === held.type) {
                continue;
            }
            if (! item.metadata === held.metadata) {
                continue;
            }
            if (item.count >= mf.itemStackHeight(item.type)) {
                continue;
            }
            this.clickSlot(i, mf.MouseButton.Left);
            held = mf.heldItem();
            if (held.type === mf.ItemType.NoItem) {
                return true;
            }
        }
        return false;
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
        if (matching_func === undefined) {
            return 0;
        }

        var count = 0;
        for (var i = 0; i < this.length; i++) {
            var it = this.itemInSlot(i);
            if (it === undefined) {
                break;
            }
            if (matching_func(it)) {
                count += item.count;
            }
        }
        return count;
    };
    /**
     * Gets the item you are holding.
     * @returns {Item} What you are now equipped with.
     */
    inventory.equippedItem = function() {
        return mf.inventoryItem(mf.selectedEquipSlot());
    };
})();

    /*
     *
     * DEPRECATED Functions below:
     *
     */

/*
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
*/

    /**
     * Looks for armor in your inventory and equips it. If you don't
     * have the armor, nothing happens.
     * @param {Number} item_id The item ID of the armor you want to equip.
     *//*
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
*/
   /**
     * Gives a snapshot containing the amounts of types of objects
     * @returns {Object} object that maps item type to
     *          total number in inventory
     */
/*
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
*/
    /**
     * Returns a snapshot of your inventory.
     * @returns [Array] items with properties:
     */
/*
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
*/
    /**
     * Tells how much room you have left in your inventory. No need to
     * worry about merging stacks; this function takes that into account.
     * @param {Number} item The item ID that you want to see how many more
     *                      will fit in your inventory.
     * @returns {Number} How many more of those items will fit.
     */
/*
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
*/
