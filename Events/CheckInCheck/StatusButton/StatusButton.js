define('Events/CheckInCheck/StatusButton/StatusButton', [
        
    'SBIS3.CONTROLS/CompoundControl',
    'Core/UserInfo',
    
    
     // Подключаем файл с разметкой компонента "Шапка".
    'tmpl!Events/CheckInCheck/StatusButton/StatusButton',
    'SBIS3.CONTROLS/Button',

    // Подключаем CSS-файл со стилевым оформлением компонента.
    'css!Events/CheckInCheck/StatusButton/StatusButton',

    
],
//Компонент для "Запроса денег"
function(CompoundControl, UserInfo, dotTplFn) {

    var StatusButton = CompoundControl.extend({
        _dotTplFn: dotTplFn,
        init: function() {
            StatusButton.superclass.init.call(this);
            this.paymentStatus = 0;
            this.updateIcon();
            this.subscribe('onReady', this.onReadyHandler);

            var owner = this._options.owner;
            var slave = this._options.slave;
            var ammount = this._options.ammount;
            var uISF = UserInfo.get('ИдентификаторСервисаПрофилей');
            this._options.creditor = "";
            this._options.debitor = "";
            if (uISF == owner){
                if (ammount > 0){
                    this._options.creditor = owner;
                    this._options.debitor = slave;
                }
                else{
                    this._options.creditor = slave;
                    this._options.debitor = owner;
                }
            }
            if (uISF == slave){
                if (ammount > 0){
                    this._options.creditor = owner;
                    this._options.debitor = slave;
                }
                else{
                    this._options.creditor = slave;
                    this._options.debitor = owner;
                }
            }
            console.log("Creditor", this._options.creditor, " Debitor:", this._options.debitor);
            
            
        },
        //Возвращает следующий статус
        nextStatus: function(){
            var uISF = UserInfo.get('ИдентификаторСервисаПрофилей');
            var res = this.paymentStatus;
            //var state;
            //if ()
            if (uISF == this._options.creditor){
                res = 2;
                fetch('/paymentService/change_payment_state', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        event_id: this._options.event_id,
                        debitor: this._options.debitor,
                        creditor: this._options.creditor,
                        state: 2,
                    })
                }).then(result => {
                }).catch(err => {
                });
                
            }
            if (uISF == this._options.debitor){
                if (status != 0)
                    return status;
                res = 1;
                fetch('/paymentService/change_payment_state', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        event_id: this._options.event_id,
                        debitor: this._options.debitor,
                        creditor: this._options.creditor,
                        state: 1,
                    })
                }).then(result => {
                }).catch(err => {
                });
            }
            return res;
        },
        //Обновление иконки по статусу
        updateIcon: function(){
            var icons = [
                'sprite: icon-24 icon-Successful2 icon-disabled', //gray - 0
                'sprite: icon-24 icon-Successful2 icon-attention', // yellow - 1
                'sprite: icon-24 icon-Successful2 icon-done', //green - 2
            ]
            var sbButton = this.getChildControlByName('sbButton');
            icon = icons[this.paymentStatus];
            sbButton.setIcon(icon);

        },
        //Смена статуса кнопки и смена иконки
        onSbActivated: function(event){
            
            
            
            this.paymentStatus = this.nextStatus();
            console.log(this.paymentStatus);
            this.updateIcon();
            //alert(sb.paymentStatus+toString(this.getIcon()))
        },

        onReadyHandler: function(){
            //Добавляем кнопку из шаблона (pqSubmitButton)
            var sbButton = this.getChildControlByName('sbButton');
            sbButton.subscribe('onActivated', this.onSbActivated.bind(this));
        },

    })


    return StatusButton
}
)