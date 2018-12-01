define('Events/CheckInCheck/RequisitesPicker/RequisitesPicker', [
    'SBIS3.CONTROLS/CompoundControl',
    'tmpl!Events/CheckInCheck/RequisitesPicker/RequisitesPicker',

    'SBIS3.CONTROLS/Utils/InformationPopupManager',
    'Core/UserInfo',

    'css!Events/CheckInCheck/RequisitesPicker/RequisitesPicker',
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
            //Получаем данные для добавления платежа и применить!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            var uISF = UserInfo.get('ИдентификаторСервисаПрофилей')
            
            //alert(uISF)
            //Отсылаем запрос на добавление платежей
            d = uISF
            

            paymentsData = JSON.stringify({
                event_id: 'be1e7e45-4081-483c-abae-62105c3f750e',
                creditor: "b7f8b7cc-1618-43ca-b0a0-454f14a8f147",
                status: 0,
                req: '123456789012345',
                debitor: [
                    {
                        debitor: "8a6603e0-f8cc-4528-8a58-6041cf410213",
                        sum: 500
                    }
                ]

                
            })
            fetch('/paymentService/add_payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: paymentsData
            });
        }

        






    })


    return RequisitesPicker
}
)