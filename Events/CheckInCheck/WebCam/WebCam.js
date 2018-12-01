
define('Events/WebCam/WebCam', [
    'SBIS3.CONTROLS/CompoundControl',
    'tmpl!Events/CheckInCheck/WebCam/WebCam',
    'css!Events/CheckInCheck/WebCam/WebCam',
 ], function (CompoundControl, dotTplFn) {
    var WebCam = CompoundControl.extend({
       _dotTplFn: dotTplFn,
 
       init: function() {
        WebCam.superclass.init.call(this);
       }
    });
 
    return WebCam;
 });