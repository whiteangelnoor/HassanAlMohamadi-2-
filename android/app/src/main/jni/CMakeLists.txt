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
# A separate static library: the app target carries C++-only flags
# (-std=c++20, -Werror) from React Native that clang rejects for C files.
add_library(swisseph STATIC ${SWISSEPH_SOURCES})
target_compile_options(swisseph PRIVATE -w -O2)
target_include_directories(swisseph PUBLIC ${SHARED_DIR}/swisseph)

target_sources(${CMAKE_PROJECT_NAME} PRIVATE
  ${SHARED_DIR}/astrocore/AstroCore.cpp
  ${SHARED_DIR}/NativeAstroEngine.cpp
)

target_include_directories(${CMAKE_PROJECT_NAME} PUBLIC
  ${SHARED_DIR}
  ${SHARED_DIR}/astrocore
)

target_link_libraries(${CMAKE_PROJECT_NAME} swisseph)
