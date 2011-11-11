#ifndef EXAMPLEPLUGIN_H
#define EXAMPLEPLUGIN_H

#include "mineflayer_plugin.h"

class ExamplePlugin : public Plugin {
public:
    virtual void preload(QScriptEngine *engine, Game *game);
private:
    static QScriptValue connectedHandler(QScriptContext *context, QScriptEngine *engine);
};

#endif // EXAMPLEPLUGIN_H
