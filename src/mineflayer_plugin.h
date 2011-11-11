#ifndef MINEFLAYER_PLUGIN_H
#define MINEFLAYER_PLUGIN_H

#include "Plugin.h"

// plugins must implement this
extern "C" Plugin * mineflayer_plugin_init();

#endif // MINEFLAYER_PLUGIN_H
