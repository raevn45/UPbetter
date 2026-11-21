import UIKit
import Capacitor

class UPBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(UPAlarmPlugin())
    }
}
