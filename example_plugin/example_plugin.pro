#-------------------------------------------------
#
# Project created by QtCreator 2011-11-11T03:31:52
#
#-------------------------------------------------

QT += script network
QT -= gui

TARGET = example_plugin
TEMPLATE = lib

DEFINES += EXAMPLE_PLUGIN_LIBRARY
SOURCES += \
    src/ExamplePlugin.cpp
HEADERS += \
    src/ExamplePlugin.h

# host src directory
INCLUDEPATH += ../src


# idk what all this is:
symbian {
    MMP_RULES += EXPORTUNFROZEN
    TARGET.UID3 = 0xEA2BC4EA
    TARGET.CAPABILITY =
    TARGET.EPOCALLOWDLLDATA = 1
    addFiles.sources = example_plugin.dll
    addFiles.path = !:/sys/bin
    DEPLOYMENT += addFiles
}
unix:!symbian {
    maemo5 {
        target.path = /opt/usr/lib
    } else {
        target.path = /usr/lib
    }
    INSTALLS += target
}
