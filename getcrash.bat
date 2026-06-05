@echo off
echo Waiting for app to crash...
adb logcat -c
adb shell am start -n com.soulremembrance.app/.MainActivity
timeout /t 5
adb logcat -d AndroidRuntime:E ReactNativeJS:E *:S > crash.txt
echo Done! Opening crash.txt...
notepad crash.txt
