#include "ExamplePlugin.h"

Plugin * mineflayer_plugin_init()
{
    return new ExamplePlugin;
}

void ExamplePlugin::preload(QScriptEngine *engine, Game *)
{
    QScriptValue mf_obj = engine->globalObject().property("mf");
    mf_obj.property("onConnected").call(mf_obj, QScriptValueList() << engine->newFunction(connectedHandler));
}

QScriptValue ExamplePlugin::connectedHandler(QScriptContext *, QScriptEngine *)
{
    qDebug() << "Hello World!";
    return QScriptValue();
}
