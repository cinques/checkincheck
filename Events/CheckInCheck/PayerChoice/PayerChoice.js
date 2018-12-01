define('Events/CheckInCheck/PayerChoice/PayerChoice', [
    'SBIS3.CONTROLS/CompoundControl',
    'tmpl!Events/CheckInCheck/PayerChoice/PayerChoice',
    'Events/CheckInCheck/MembersFieldLink',
    'css!Events/CheckInCheck/PayerChoice/PayerChoice'
 ], function (CompoundControl, dotTplFn) {
    var PayerChoice = CompoundControl.extend({
       _dotTplFn: dotTplFn,
       $constructor() {
         this._publish('onChoice');
       },
       init: function() {
         PayerChoice.superclass.init.call(this);
         this.subscribeTo(this.getChildControlByName('choice'), 'onActivated', () => {
            this._notify('onChoice', this.getChildControlByName('payer').getSelectedKey());
            this.getTopParent().close();
         });
       }
    });
 
    return PayerChoice;
 });