define('Events/RequisitesPicker/RequisitesPicker', [
    'SBIS3.CONTROLS/CompoundControl',
    'tmpl!Events/RequisitesPicker/RequisitesPicker',

    'SBIS3.CONTROLS/Utils/InformationPopupManager',
    'Core/UserInfo',

    'css!Events/RequisitesPicker/RequisitesPicker',
],

//Компонент для "Запроса денег"
function(CompoundControl, dotTplFn, InformationPopupManager, UserInfo) {

    var RequisitesPicker = CompoundControl.extend({
        _dotTplFn: dotTplFn,
        init: function() {
            RequisitesPicker.superclass.init.call(this);
            
            this.subscribe('onReady', this.onReadyHandler1)
        },



        onReadyHandler1: function(){
            //Добавляем кнопку из шаблона (requisitesSubmitButton)
            var requisitesSubmitButton = this.getChildControlByName('requisitesSubmitButton')
            //alert(requisitesSubmitButton.name)
            requisitesSubmitButton.subscribe('onActivated', function (event){
                 message = 'Проверьте свои реквизиты: '
                 message = message + this.getParent().getChildControlByName('myRequisitesTextBox').getText()
                 //alert(message)
                 InformationPopupManager.showConfirmDialog({
                     message: message,
                     details: 'Если данные не верны, нажмите «Нет».',
                     opener: this,
                  },

                  this.getParent().AcceptRequisites
                  );
                
                
            })

            
        },

        //Вызывается если пользователь проверил и принял указаные реквизиты
        AcceptRequisites: function (){
            var uISF = UserInfo.get('ИдентификаторСервисаПрофилей')
            
            alert(uISF)
        }

        






    })


    return RequisitesPicker
}
)