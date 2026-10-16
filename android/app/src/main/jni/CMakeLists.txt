# Builds the app's C++ code, including AstroCore and the Swiss Ephemeris.
# AGPL-3.0-or-later.
cmake_minimum_required(VERSION 3.13)
project(appmodules)

include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

set(SHARED_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../../../../../shared)

# Swiss Ephemeris (C). Only the library sources, no command-line tools.
set(SWISSEPH_SOURCES
  ${SHARED_DIR}/swisseph/swedate.c
  ${SHARED_DIR}/swisseph/swehouse.c
  ${SHARED_DIR}/swisseph/swejpl.c
  ${SHARED_DIR}/swisseph/swemmoon.c
  ${SHARED_DIR}/swisseph/swemplan.c
  ${SHARED_DIR}/swisseph/sweph.c
  ${SHARED_DIR}/swisseph/swephlib.c
  ${SHARED_DIR}/swisseph/swecl.c
  ${SHARED_DIR}/swisseph/swehel.c
)
set_source_files_properties(${SWISSEPH_SOURCES} PROPERTIES
  LANGUAGE C
  COMPILE_FLAGS "-w")

target_sources(${CMAKE_PROJECT_NAME} PRIVATE
  ${SWISSEPH_SOURCES}
  ${SHARED_DIR}/astrocore/AstroCore.cpp
  ${SHARED_DIR}/NativeAstroEngine.cpp
)

target_include_directories(${CMAKE_PROJECT_NAME} PUBLIC
  ${SHARED_DIR}
  ${SHARED_DIR}/astrocore
  ${SHARED_DIR}/swisseph
)
