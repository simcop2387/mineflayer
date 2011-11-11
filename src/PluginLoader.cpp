#include "PluginLoader.h"

#include <QDir>

#include <dlfcn.h>

void PluginLoader::init()
{
    QDir plugin_directory("plugins");
    foreach (QFileInfo plugin_path, plugin_directory.entryInfoList(QStringList("*.so"), QDir::Files)) {
        void * plugin_library = dlopen(plugin_path.filePath().toStdString().c_str(), RTLD_LAZY);
        void * init_function = NULL;
        if (plugin_library != NULL)
            init_function = dlsym(plugin_library, "mineflayer_plugin_init");
        if (init_function == NULL) {
            qWarning() << "WARNING: failed to load plugin" << plugin_path.filePath().toStdString().c_str() << ":" << dlerror();
            continue;
        }
        Plugin * plugin = ((Plugin*(*)())init_function)();
        if (plugin == NULL) {
            qWarning() << "WARNING: plugin init returned null:" << plugin_path.filePath();
            continue;
        }
        m_plugins.append(plugin);
    }
}

QList<Plugin*> PluginLoader::plugins()
{
    return m_plugins;
}

