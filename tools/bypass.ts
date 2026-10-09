declare const Java: any;

Java.perform(() => {
  const SuperUserSafety = Java.use(
    "com.oculus.appsafety.signals.SuperUserSafetySignal"
  );

  const ArrayList = Java.use("java.util.ArrayList");

  const empty = () => ArrayList.$new();

  SuperUserSafety.checkPackages.implementation = function (_packages: any) {
    return empty();
  };

  SuperUserSafety.checkBinaries.implementation = function (_binaries: any) {
    return empty();
  };
});

// Credits to Tardguyronin and Vxnishh