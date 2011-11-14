mf.include("chat_commands.js");
mf.include("navigator.js");
mf.include("block_finder.js");
mf.include("inventory.js");

(function() {
    chat_commands.registerCommand("window", function(speaker, args, responder_func) {
        responder_func("Currently open window: " + mf.openWindow());
    });

    chat_commands.registerCommand("chest", function openChest(speaker, args, responder_func) {
        if (mf.openWindow() !== mf.WindowType.None) {
            mf.closeWindow();
        }
        var points = block_finder.findNearest(mf.self().position, 54);
        if (points.length <= 0) {
            responder_func("Can't find any chests");
            return;
        }
        var point = points.shift();
        navigator.navigateTo(point, {
            end_radius: 6,
            timeout_milliseconds: 6 * 1000,
            cant_find_func: function() {
                responder_func("Can't reach chest");
            },
            arrived_func: function() {
                mf.hax.activateBlock(point);
                responder_func("<Insert Zelda Chest Opened Sound>");
            }
        });
    });

    chat_commands.registerCommand("inventory", function openInv(speaker, args, responder_func) {
        if (mf.openWindow() !== mf.WindowType.None) {
            mf.closeWindow();
        }
        mf.openInventoryWindow();
        mf.onWindowOpened(function invOpen(window_type) {
            mf.removeHandler(mf.onWindowOpened, invOpen);
            responder_func("Wow I'm carrying a ton of crap!");
        });
    });

    chat_commands.registerCommand("close", function close(speaker, args, responder_func) {
        if (mf.openWindow() !== mf.WindowType.None) {
            mf.closeWindow();
            responder_func("Window closed");
        }
    });

    function held(speaker, args, responder_func) {
        responder_func("I am holding " + mf.heldItem().count + " " + items.nameForId(mf.heldItem().type) + " metadata: " + mf.heldItem().metadata);
    }

    chat_commands.registerCommand("held", held);

    chat_commands.registerCommand("click", function(speaker, args, responder_func) {
        var slot = parseInt(args.shift());
        if (slot === NaN) {
            responder_func("That's not a slot number.  Idiot.");
            return;
        }
        var invType = inventory.Inventory;
        if (args.length !== 0) {
            var arg = args.shift();
            if (arg === "chest" || arg === "Chest") {
                invType = inventory.Chest;
            }
        }
        invType.clickSlot(slot, mf.MouseButton.Left);
        held(speaker, args, responder_func);
    }, 1, 2);

    chat_commands.registerCommand("size", function(speaker, args, responder_func) {
        if (mf.uniqueSlotCount() > 9000) {
            responder_func("IT'S OVER 9000!");
        } else { 
            responder_func("The current unique window size is " + mf.uniqueSlotCount());
        }
    });
})();
