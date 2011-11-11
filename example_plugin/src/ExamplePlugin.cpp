#include "ExamplePlugin.h"

Plugin * mineflayer_plugin_init()
{
    return new ExamplePlugin;
}

void ExamplePlugin::preload(QScriptEngine *engine, Game *game)
{
}
