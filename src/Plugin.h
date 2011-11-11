#ifndef PLUGIN_H
#define PLUGIN_H

#include <QScriptEngine>

#include "Game.h"

class Plugin {
public:
    /** called before the main .js file has been run */
    virtual void preload(QScriptEngine *engine, Game *game) = 0;
};

#endif // PLUGIN_H
