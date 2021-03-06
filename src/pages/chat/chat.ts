import { Component, ViewChild } from '@angular/core';
import { NavController, NavParams, Content, ActionSheetController, PopoverController, ModalController } from 'ionic-angular';
import { AngularFireDatabase, FirebaseListObservable } from 'angularfire2/database';
import * as firebase from 'firebase';
import { SpeechRecognition } from '@ionic-native/speech-recognition';
import { ChatProvider } from '../../providers/chat/chat';
import { EmojiComponent } from './../../components/emoji/emoji';

@Component({
  selector: 'page-chat',
  templateUrl: 'chat.html',
})
export class ChatPage {

  message = '';
  emojiMeg: string;
  uid: string;
  avatar: string;
  interlocutor: string;
  chats: FirebaseListObservable<any>;
  voiceToText:Array<string>;
  @ViewChild(Content) content: Content;
  isTyping:boolean=false;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public actionSheetCtrl: ActionSheetController,
    public popoverCtrl: PopoverController,
    public modalCtrl: ModalController,
    public cp: ChatProvider,
    public afd: AngularFireDatabase,
    public speechRecognition: SpeechRecognition
  ) {

    this.uid = navParams.data.uid;
    this.interlocutor = navParams.data.interlocutor;
    this.avatar = navParams.data.avatar

    // Get Chat Reference
    cp.getChatByID(this.uid, this.interlocutor)
      .subscribe(user => { console.log('getChatByID' + user)})
      this.typingIndicatorExit();
      this.speechRecognition.isRecognitionAvailable()
      .then((available: boolean) => console.log("available:::::::",available))
      this.speechRecognition.hasPermission()
  .then((hasPermission: boolean) => console.log("hasPermission::::::",hasPermission))
  }

  presentPopover(myEvent) {
    let profileModal = this.modalCtrl.create(EmojiComponent);
    profileModal.present();
    profileModal.onDidDismiss(data => {
      if (!data) return;
      this.message = this.message.concat('' + data);
    });
    /*  let popover = this.popoverCtrl.create(EmojiComponent);
     popover.present({
       ev: myEvent
     }); */
  }

  ionViewDidLoad() {
    // Get Chat Reference
    this.cp.getChatRef(this.uid, this.interlocutor)
      .then((chatRef: any) => {
        this.chats = this.afd.list(chatRef);
        this.afd.list(chatRef).subscribe(chats => {
          console.log(chats);
          setTimeout(() => {
            this.content.scrollToBottom();
          }, 300);
        })
      });

      this.getIsTyping();
  }



  sendMessage() {
    if (this.message) {
      let chat = {
        from: this.uid,
        message: this.message,
        type: 'message',
        createdAt: firebase.database.ServerValue.TIMESTAMP
      };
      this.isTyping = false;
      this.chats.push(chat);
      this.message = "";
      this.hideTypingIndicator();
      this.showRedNotification()
    }
  };

  sendVoiceMeg() {
    let voiceToText:string = '';
    this.speechRecognition.startListening()
    .subscribe(
      (matches: Array<string>) => {
        matches.map((d,i)=>{
          voiceToText = voiceToText + ' '+ d
        })
        this.message = this.message.concat('' + voiceToText);
        console.log(voiceToText)
      },
      (onerror) => console.log('error:', onerror)
    )
  }

  sendPicture() {
    let chat = {
      from: this.uid,
      type: 'picture',
      picture: null,
      createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    let actionSheet = this.actionSheetCtrl.create({
      title: 'Modify your album',
      buttons: [
        {
          text: 'From Camera',
          role: 'destructive',
          icon: 'camera',
          handler: () => {
            this.cp.getPicture(1)
              .then((image) => {
                chat.picture = image;
                this.chats.push(chat);
              });
          }
        }, {
          text: 'From Gallery ',
          role: 'destructive',
          icon: 'images',
          handler: () => {
            this.cp.getPicture(0)
              .then((image) => {
                chat.picture = image;
                this.chats.push(chat);
              });
          }
        }, {
          text: 'Cancel',
          role: 'cancel',
          icon: 'close',
          handler: () => {
            console.log('Cancel clicked');
          }
        }
      ]
    });
    actionSheet.present();
  }

  allowTypingIndicator(event){
    this.afd.object(`/typing/${this.interlocutor},${this.uid}/${this.interlocutor}`).set({isTyping:true});
  }
  
  getIsTyping() {
    let firstRef = firebase.database().ref(`/typing/${this.uid},${this.interlocutor}/${this.uid}/isTyping`).once('value')
    firstRef.then(snapshot => {
      if(snapshot.val()){
        this.isTyping = true;
      }else{
        this.isTyping = false;
      }
    })
  }

  typingIndicatorExit(){
    this.afd.object(`/typing/${this.uid},${this.interlocutor}/${this.uid}`, { preserveSnapshot: true }).subscribe(snapshot => {
      let a = snapshot.exists();
      if (a) {
        this.getIsTyping()
      } else {
        false;
      }
    });
  }

  hideTypingIndicator(){
    console.log(`/typing/${this.interlocutor},${this.uid}/${this.interlocutor}`)
    this.afd.object(`/typing/${this.interlocutor},${this.uid}/${this.interlocutor}`, { preserveSnapshot: true }).subscribe(snapshot => {
      let a = snapshot.exists();
      if (a) {
        this.afd.object(`/typing/${this.interlocutor},${this.uid}/${this.interlocutor}`).update({isTyping:false})
      } else {
        false;
      }
    });

  }

  showRedNotification(){
    this.afd.object(`/notification/${this.uid}`).set({notification:true});
  }
}
