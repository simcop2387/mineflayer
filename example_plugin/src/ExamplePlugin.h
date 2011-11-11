#ifndef EXAMPLEPLUGIN_H
#define EXAMPLEPLUGIN_H

#include "mineflayer_plugin.h"

class ExamplePlugin : public Plugin {
public:
    virtual void preload(QScriptEngine *engine, Game *game);
};

#endif // EXAMPLEPLUGIN_H
