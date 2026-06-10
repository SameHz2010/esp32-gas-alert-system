#pragma once

bool initAlertModule();
void pollAlertModule();
int sampleGasSensor();
int detectGasState(float temperature, float humidity, int gas, float deltaGas, float gasRelative);
void alertControl(int state);
void placeAlertCall(unsigned long &lastCallTime);
