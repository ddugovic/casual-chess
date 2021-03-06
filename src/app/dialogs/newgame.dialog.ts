import { Component, Input, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { ConfigurationService } from '../shared/configuration.service';
import { Configuration, Game } from '../shared/model';
import { Subscription } from 'rxjs';
import { UtilsService } from '../shared/utils.service';
import { AngularFirestore } from '@angular/fire/firestore';

@Component({
  selector: 'position-newgame',
  templateUrl: 'newgame.dialog.html',
  styleUrls: ['newgame.dialog.scss'],
})
export class NewgameDialog implements OnInit, OnDestroy {

  @ViewChild('slider', { static: true }) slider: any;
  @ViewChild('nametext', { static: true }) nametext: any;
  
  private subscriptions: Subscription[] = [];
  public configuration: Configuration;
  public playerType: string;
  public gameName: string;
  public texts: any;
  public game = null;

  constructor(
    public modalController: ModalController,
    public translate: TranslateService,
    private toast: ToastController,
    private utils: UtilsService,
    private afs: AngularFirestore,
    private configurationService: ConfigurationService) {
      this.configurationService.initialize().then(config => {
        this.configuration = config;
      });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
    this.subscriptions = [];
  }

  ngOnInit(): void {
    this.slider.lockSwipes(true);
    this.subscriptions.push(this.translate.get([
      'position.newgame-dialog.name-required',
      'position.newgame-dialog.link-copied'
    ]).subscribe(async res => {
      this.texts = res;
    }));
  }

  ionModalWillPresent() {
    this.playerType = null;
    this.gameName = null;
  }

  btnCloseClick() {
    this.modalController.dismiss(null);
  }

  showNextSlide() {
    return this.slider.lockSwipes(false).then(() => {
      return this.slider.slideNext().then(() => {
        return this.slider.lockSwipes(true);
      });
    });
  }

  setPlayerType(playerType: string) {
    this.playerType = playerType;
    this.showNextSlide();
  }

  setGameName() {
    this.nametext.getInputElement().then(async element => {
      const value = element.value.trim();
      if (value.length == 0) {
        const toast = await this.toast.create({
          message: this.texts['position.newgame-dialog.name-required'],
          position: 'middle',
          color: 'warning',
          duration: 3000
        });
        toast.present();
      } else {
        this.gameName = value;
        this.game = {
          timestamp: new Date(),
          uid: null,
          vid: `v${this.utils.uuidv4()}`,
          wid: `w${this.utils.uuidv4()}`,
          bid: `b${this.utils.uuidv4()}`,
          wpkey: null,
          bpkey: null,
          wpname: (this.playerType == 'w' ? this.gameName : null),
          bpname: (this.playerType == 'b' ? this.gameName : null),
          wpnotif: true,
          bpnotif: true,
          pgn: '',
          gameover: false,
          wdeleted: false,
          bdeleted: false
        };
        this.afs.collection<Game>('games').add(this.game).then(result => {
          this.game.uid = result.id;
          this.afs.collection<Game>('games').doc(result.id).update(this.game).then(() => {
            this.utils.linkGameToUser(this.game, this.playerType);
            this.showNextSlide();
          });
        });
      }
    });
  }

  copyWhiteLink() {
    this.copyToClipboard(`https://casual-chess.web.app/position/${this.game.wid}`);
  }

  copyBlackLink() {
    this.copyToClipboard(`https://casual-chess.web.app/position/${this.game.bid}`);
  }

  copyViewerLink() {
    this.copyToClipboard(`https://casual-chess.web.app/position/${this.game.vid}`);
  }
  
  copyToClipboard(content: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(content);
    } else {
      const el = document.createElement('textarea');
      el.value = content;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    this.showToastClipboard();
  }
  private async showToastClipboard() {
    const toast = await this.toast.create({
      message: this.texts['position.newgame-dialog.link-copied'],
      position: 'middle',
      color: 'success',
      duration: 1000
    });
    toast.present();
  }

  showGame() {
    this.modalController.dismiss(this.playerType == 'w' ? this.game.wid : this.game.bid);
  }
}
