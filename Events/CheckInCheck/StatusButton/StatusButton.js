define('Events/CheckInCheck/StatusButton/StatusButton', [
        
    'SBIS3.CONTROLS/CompoundControl',
    
    
     // Подключаем файл с разметкой компонента "Шапка".
    'tmpl!Events/CheckInCheck/StatusButton/StatusButton',
    'SBIS3.CONTROLS/Button',

    // Подключаем CSS-файл со стилевым оформлением компонента.
    'css!Events/CheckInCheck/StatusButton/StatusButton',

    
],
//Компонент для "Запроса денег"
function(CompoundControl, dotTplFn) {

    var StatusButton = CompoundControl.extend({
        _dotTplFn: dotTplFn,
        init: function() {
            StatusButton.superclass.init.call(this);
            this.paymentStatus = 0
            this.updateIcon()
            this.subscribe('onReady', this.onReadyHandler)
        },
        //Возвращает следующий статус
        nextStatus: function(status){
            status += 1
            if (status > 2){
                status = 2
            }
            return status
        },
        //Обновление иконки по статусу
        updateIcon: function(){
            var icons = [
                'sprite: icon-24 icon-Successful2 icon-disabled', //gray - 0
                'sprite: icon-24 icon-Successful2 icon-attention', // yellow - 1
                'sprite: icon-24 icon-Successful2 icon-done', //green - 2
            ]
            icon = icons[this.paymentStatus]
            var sbButton = this.getChildControlByName('sbButton')
            sbButton.setIcon(icon)

        },
        //Смена статуса кнопки и смена иконки
        onSbActivated: function(event){
            var sb = this.getParent()
            sb.paymentStatus = sb.nextStatus(sb.paymentStatus)
            sb.updateIcon()
            //alert(sb.paymentStatus+toString(this.getIcon()))
        },

        onReadyHandler: function(){
            //Добавляем кнопку из шаблона (pqSubmitButton)
            var sbButton = this.getChildControlByName('sbButton')
            sbButton.subscribe('onActivated', this.onSbActivated)
        },

    })


    return StatusButton
}
)