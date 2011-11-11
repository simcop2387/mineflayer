#ifndef PLUGINLOADER_H
#define PLUGINLOADER_H

#include "Plugin.h"

namespace PluginLoader
{
    void init();
    QList<Plugin*> plugins();

    namespace // private
    {
        QList<Plugin*> m_plugins;
    }
}

#endif // PLUGINLOADER_H
