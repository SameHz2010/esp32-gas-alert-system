#ifndef WAVEFORM_H
#define WAVEFORM_H

#include <time.h>
#include "ST7789.h"

void initWaveformDisplay(ST7789 &lcd);
void updateWaveform(ST7789 &lcd, int gas, int state, struct tm *timeinfo);

#endif